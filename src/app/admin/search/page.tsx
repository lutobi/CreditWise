
"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, User, FileText, Loader2, ArrowRight } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

type SearchResult = {
    type: 'profile' | 'loan'
    data: any
}

import { Suspense } from "react"

function SearchContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()

    const initialQuery = searchParams.get('q') || ''
    const [query, setQuery] = useState(initialQuery)
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    useEffect(() => {
        if (!authLoading && user) {
            const role = user.app_metadata?.role;
            if (!['admin', 'admin_verifier', 'admin_approver'].includes(role || '')) {
                router.push('/')
            }
        }
    }, [user, authLoading])

    useEffect(() => {
        if (initialQuery) {
            handleSearch(initialQuery)
        }
    }, [initialQuery])

    const handleSearch = async (term: string) => {
        if (!term) return
        setLoading(true)
        setSearched(true)
        try {
            const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`)
            const data = await res.json()
            setResults(data.results || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const onSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSearch(query)
        router.push(`/admin/search?q=${encodeURIComponent(query)}`)
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto mb-8">
                    <h1 className="text-2xl font-bold mb-4">Global Search</h1>
                    <form onSubmit={onSearchSubmit} className="flex gap-2">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by Name, ID, Phone, or Reference..."
                            className="h-12 text-lg"
                        />
                        <Button type="submit" size="lg" className="h-12 px-6">
                            <Search className="w-5 h-5" />
                        </Button>
                    </form>
                </div>

                <div className="max-w-4xl mx-auto">
                    {loading && <div className="text-center py-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-primary" /></div>}

                    {!loading && searched && results.length === 0 && (
                        <div className="text-center py-10 text-slate-500">No results found for "{query}"</div>
                    )}

                    <div className="grid gap-4">
                        {results.map((result, i) => (
                            <Card key={i} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                                if (result.type === 'loan') {
                                    // TODO: Open Loan Detail Modal or Redirect
                                    alert(`Loan ID: ${result.data.id}`)
                                } else {
                                    // Profile
                                    alert(`User ID: ${result.data.id}`)
                                }
                            }}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${result.type === 'profile' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                        {result.type === 'profile' ? <User className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg">
                                                    {result.type === 'profile' ? result.data.full_name : `Loan Application`}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {result.type === 'profile' ? (
                                                        <>ID: {result.data.national_id} • {result.data.phone_number}</>
                                                    ) : (
                                                        <>Ref: {result.data.application_data?.refId || 'N/A'} • {result.data.profiles?.full_name}</>
                                                    )}
                                                </p>
                                            </div>
                                            {result.type === 'loan' && (
                                                <Badge variant={result.data.status === 'approved' ? 'default' : 'secondary'}>
                                                    {result.data.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default function AdminSearchPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <SearchContent />
        </Suspense>
    )
}
