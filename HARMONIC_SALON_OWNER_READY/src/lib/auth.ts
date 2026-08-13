import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { OtpCode } from "@/models/OtpCode";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const email = credentials.email.toLowerCase().trim();
        const user = await User.findOne({ email });
        if (!user) return null;

        const pass = credentials.password;

        // OTP login: password = "otp:123456"
        if (pass.startsWith("otp:")) {
          const code = pass.slice(4);
          const verified = await OtpCode.findOne({
            email,
            code: `VERIFIED:${code}`,
            used: false,
            expiresAt: { $gt: new Date() },
          });
          if (!verified) return null;
          verified.used = true;
          await verified.save();
        } else {
          const ok = await bcrypt.compare(pass, user.passwordHash);
          if (!ok) return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone || "",
          staffId: user.staffId?.toString() || null,
        };
      },
    }),
  ],
  // JWT session = access token style cookie (httpOnly via next-auth)
  // maxAge = expire token lifetime (seconds). Default 30 days.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.staffId = (user as any).staffId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).staffId = token.staffId;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  // NEXTAUTH_SECRET = signing key for JWT (required in production)
  secret: process.env.NEXTAUTH_SECRET,
};
