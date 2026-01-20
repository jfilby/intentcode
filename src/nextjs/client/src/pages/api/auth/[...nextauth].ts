import { prisma } from '@/db'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import AppleProvider from 'next-auth/providers/apple'
import FacebookProvider from 'next-auth/providers/facebook'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { customSendVerificationRequest } from '@/services/email/nextauth-custom'

export default NextAuth({
  theme: {
    logo: '/img/logo/logo-color.png'
  },
  pages: {
    signIn: '/account/auth/sign-in',
    verifyRequest: '/account/auth/verify-request'
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      async authorize(credentials) {

        console.log(`CredentialsProvider.authorize: starting..`)

        if (!credentials) return null

        const demoUser = {
          id: '1',
          name: 'Demo user',
          email: 'demo@aiconstrux.com',
          username: 'demo',
          password: 'test'
        }

        if (credentials.username === demoUser.username &&
            credentials.password === demoUser.password) {

          console.log(`CredentialsProvider.authorize: logging in demo user..`)

          return {
            id: demoUser.id,  // Required field
            name: demoUser.name,
            email: demoUser.email,
          }
        }

        return null  // Return null if authentication fails
      },
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
    }),
    /* CredentialsProvider({
      async authorize(credentials) {

        console.log(`CredentialsProvider.authorize(): ${credentials}`)

        try {
          const user = await prisma.user.findFirst({
            where: {
              email: credentials['email']
            }
          });

          if (user !== null) {
            //Compare the hash
            const res = await confirmPasswordHash(
                                credentials['password'],
                                user.password)

            if (res === true) {
              userAccount = {
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isActive: user.isActive
              };
              return userAccount;
            }
            else {
              console.log('Hash not matched logging in');
              return null;
            }
          }
          else {
            return null;
          }
        }
        catch (err) {
          console.log('Authorize error:', err);
        }

      },
      credentials: {}
    }), */
    // OAuth authentication providers...
    // Note: temporarily commented out until app approval from the providers
    /* AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET
    }), */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // allowDangerousEmailAccountLinking: true,
      httpOptions: {
        timeout: 20000,  // 20 seconds
      }
    }),
    // Passwordless / email sign in
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      sendVerificationRequest({ identifier, url, provider, theme }) {
        customSendVerificationRequest({ identifier, url, provider, theme })
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      return true
    },
    async redirect({ url, baseUrl }) {
      return baseUrl
    },
    async session({ session, user, token }) {

      if (token != null && session.user != null) {

        // session.user.id = token.id  // Pass user ID to session
        session.user.name = token.name
        session.user.email = token.email
      }

      return session
    },
    async jwt({ token, user, account, profile, isNewUser }) {

      if (user) {
        token.id = user.id  // Attach user ID to token
        token.name = user.name
        token.email = user.email
      }

      return token
    }
  },
  secret: process.env.JWT_SECRET,
  session: {
    strategy: 'jwt'
  }
  // debug: true
})
