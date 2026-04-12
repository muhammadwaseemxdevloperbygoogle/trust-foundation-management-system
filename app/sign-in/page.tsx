"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function SignInForm() {
	const router = useRouter()
	const { login } = useAuth()
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError("")
		setLoading(true)
		try {
			const ok = await login(username, password)
			if (!ok) {
				setError("Invalid username/password or server not reachable")
				return
			}
			router.push("/dashboard")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card className="w-full max-w-md border-border/50 shadow-xl">
			<CardHeader>
				<CardTitle>Sign In</CardTitle>
				<CardDescription>Use your assigned username and password.</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<label className="text-sm font-medium">Username</label>
						<Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Password</label>
						<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
					</div>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Signing in..." : "Sign In"}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}

export default function SignInPage() {
	return (
		<AuthProvider>
			<div className="min-h-dvh flex items-center justify-center bg-background p-4">
				<div className="fixed inset-0 islamic-pattern opacity-5 pointer-events-none" />
				<div className="relative z-10 w-full flex justify-center">
					<SignInForm />
				</div>
			</div>
		</AuthProvider>
	)
}
