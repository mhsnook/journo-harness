import { SELF } from 'cloudflare:test'

/** One JSON frame off the Article Agent's WebSocket. The socket is
 * multiplexed — state, RPC, identity, and MCP frames all ride it — so a test
 * asks for the frame it wants rather than reading the next one. */
type Frame = { type: string } & Record<string, unknown>

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A test client speaking the Agents SDK's wire protocol directly. The real
 * client is `useAgent`, which needs React and a browser, so a workerd test
 * sends the frames itself.
 */
export async function openAgentSocket(name: string) {
	const response = await SELF.fetch(`https://harness.test/agents/article-agent/${name}`, {
		headers: { Upgrade: 'websocket' },
	})

	const socket = response.webSocket
	if (!socket)
		throw new Error(`The Agent route answered ${response.status}, not a socket.`)
	socket.accept()

	const frames: Frame[] = []
	const taken = new Set<number>()
	socket.addEventListener('message', (event) => {
		frames.push(JSON.parse(event.data as string) as Frame)
	})

	/** The first frame this test has not yet taken that the predicate accepts.
	 * Polls, because a broadcast arrives whenever the Agent sends it. */
	async function take(match: (frame: Frame) => boolean, wanted: string): Promise<Frame> {
		for (let attempt = 0; attempt < 200; attempt++) {
			for (let index = 0; index < frames.length; index++) {
				if (taken.has(index) || !match(frames[index])) continue
				taken.add(index)
				return frames[index]
			}
			await wait(10)
		}

		throw new Error(`No ${wanted} frame arrived on the ${name} socket.`)
	}

	return {
		/** Push a Plan up the socket, the way the client applies every Plan
		 * write. Nothing is awaited: the Agent answers with a broadcast or an
		 * error frame. */
		setState(state: unknown) {
			socket.send(JSON.stringify({ type: 'cf_agent_state', state }))
		},

		/** Call a `@callable` method and wait for its answer. */
		async call<T>(method: string, ...args: unknown[]): Promise<T> {
			const id = crypto.randomUUID()
			socket.send(JSON.stringify({ type: 'rpc', id, method, args }))

			const frame = await take(
				(candidate) => candidate.type === 'rpc' && candidate.id === id,
				`rpc answer to ${method}`,
			)
			if (frame.success !== true) throw new Error(String(frame.error))

			return frame.result as T
		},

		/** The next frame of this type the test has not already taken. */
		next(type: string): Promise<Frame> {
			return take((frame) => frame.type === type, type)
		},

		/** Every frame of this type still untaken once the wire goes quiet. Use
		 * it to assert that nothing arrived. */
		async quiet(type: string): Promise<Frame[]> {
			await wait(50)

			return frames.filter((frame, index) => !taken.has(index) && frame.type === type)
		},

		close() {
			socket.close()
		},
	}
}
