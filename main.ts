import z from 'zod'
import { initTRPC } from '@trpc/server'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { createTRPCClient, httpBatchLink } from '@trpc/client'

type StoreResultToLocalVariable = {
	target: 'local-variable'
}

type StoreResultToCustomVariable = {
	target: 'custom-variable'
}

type StoreActionResultTarget = StoreResultToLocalVariable | StoreResultToCustomVariable | undefined

const zodStoreActionResultTarget: z.ZodSchema<StoreActionResultTarget> = z.union([
	z.undefined(),
	z.discriminatedUnion('target', [
		z.object({
			target: z.literal('local-variable'),
		}),
		z.object({
			target: z.literal('custom-variable'),
		}),
	]),
])


const { router, procedure: publicProcedure }  = initTRPC.create();

const { promise: serverShutdown, resolve } = Promise.withResolvers<string>()

console.log('creating router...')

const appRouter = router({
  setTarget: publicProcedure.input(z.object({
    target: zodStoreActionResultTarget,
  })).mutation(async ({ input: { target }}) => {
    console.log('got target:', target)
    return true
  }),
  quit: publicProcedure.mutation(async () => {
    console.log('shutting down server...')
    server.close(() => {
      console.log('server shut down')
      resolve('quit')
    })
    return true
  }),
});
 type AppRouter = typeof appRouter;

 console.log('creating/starting server...')

 const server = createHTTPServer({
  router: appRouter,
});
server.listen(3000);

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000',
    }),
  ],
})

try {
  console.log('calling setTarget with custom-variable')

  await trpc.setTarget.mutate({
    target: {
      target: 'custom-variable',
    }
  })

  console.log('calling setTarget with undefined')

  await trpc.setTarget.mutate({ target: undefined })

  console.log('trpc calls complete')
} catch (e) {
  console.log('error thrown:', e)
} finally {
  console.log('quitting...')

  await trpc.quit.mutate()

  await serverShutdown

  process.exit(0)
}

