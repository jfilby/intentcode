import { IncomingMessage, ServerResponse } from 'node:http'
import { ApolloServer, ApolloServerPlugin } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import resolvers from '@/apollo/resolvers/resolvers'
import { typeDefs } from '@/apollo/typedefs/typedefs'
// import Cors from 'micro-cors'

// const cors = Cors()

const {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault
} = require('@apollo/server/plugin/landingPage/default')

/* const corsOptions = {
  origin: process.env.GRAPHQL_URL,
  credentials: false
} */

// This no index header plug-in is used to prevent search engines displaying
// the GraphQL page in search results.
const noIndexHeaderPlugin: ApolloServerPlugin = {
  async serverWillStart() {
    return {
      async drainServer() {},
      async onRequest({ request, response }: {
        request: IncomingMessage
        response: ServerResponse
      }) {
        response.setHeader('X-Robots-Tag', 'noindex')
      }
    }
  }
}

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // cors: corsOptions,
  csrfPrevention: true,
  cache: 'bounded',
  /**
   * What's up with this embed: true option?
   * These are our recommended settings for using AS;
   * they aren't the defaults in AS3 for backwards-compatibility reasons but
   * will be the defaults in AS4. For production environments, use
   * ApolloServerPluginLandingPageProductionDefault instead.
  **/
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    noIndexHeaderPlugin
    // ApolloServerPluginLandingPageProductionDefault({ embed: true })
  ],
})

// The `listen` method launches a web server.
const { url } = await startStandaloneServer(server, {
  context: async ({ req }: any) => ({ token: req.headers.token }),
  listen: { port: Number(process.env.NEXT_PUBLIC_GRAPHQL_PORT) },
})


const graphqlHandler = async (req: any, res: any) => {

  ;
}

export default graphqlHandler

//exports.handler = apolloServer.createHandler()({ path: '/api/graphql' })

// module.exports = apolloServer.start().then(() => apolloServer.createHandler({ path: '/api/graphql' }))

