import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        login: { label: "Usuario o Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        const login = credentials.login.trim().toLowerCase();
        let usuario;
        try {
          usuario = await prisma.usuario.findFirst({
            where: {
              OR: [
                { email: login },
                { username: login },
              ],
            },
            select: {
              id: true,
              email: true,
              username: true,
              nombre: true,
              password: true,
              rol: true,
            },
          });
        } catch (err) {
          console.error("[AUTH] prisma.findFirst error:", err);
          return null;
        }

        console.log("[AUTH] usuario encontrado:", usuario ? usuario.email : "null");

        if (!usuario) return null;

        let passwordValida;
        try {
          passwordValida = await bcrypt.compare(credentials.password, usuario.password);
        } catch (err) {
          console.error("[AUTH] bcrypt error:", err);
          return null;
        }

        console.log("[AUTH] password valida:", passwordValida);

        if (!passwordValida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          role: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
