"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FileUpload } from "@/components/ui/file-upload"
import { useAuth } from "@/components/auth-provider"
import { uploadDocument, getUserDocuments, type DocumentType, type Document } from "@/lib/documents"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

export default function DocumentsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()

    const [isLoading, setIsLoading] = React.useState(false)
    const [documents, setDocuments] = React.useState<Document[]>([])

    // File states
    const [nationalIdFront, setNationalIdFront] = React.useState<File | null>(null)
    const [nationalIdBack, setNationalIdBack] = React.useState<File | null>(null)
    const [payslip, setPayslip] = React.useState<File | null>(null)
    const [proofOfResidence, setProofOfResidence] = React.useState<File | null>(null)

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login?redirect=/documents")
        } else if (user) {
            loadDocuments()
        }
    }, [user, authLoading, router])

    const loadDocuments = async () => {
        if (!user) return

        const { success, documents: docs, error } = await getUserDocuments(user.id)
        if (success && docs) {
            setDocuments(docs)
        } else if (error) {
            toast.error("Failed to load documents")
        }
    }

    const handleUpload = async (documentType: DocumentType, file: File | null) => {
        if (!user || !file) return

        setIsLoading(true)
        try {
            const { success, error } = await uploadDocument(user.id, documentType, file)

            if (success) {
                toast.success("Document uploaded successfully!")
                await loadDocuments()
            } else {
                toast.error(error || "Failed to upload document")
            }
        } catch (err: any) {
            toast.error(err.message || "Upload failed")
        } finally {
            setIsLoading(false)
        }
    }

    const getDocumentStatus = (docType: DocumentType) => {
        const doc = documents.find(d => d.document_type === docType)
        return doc?.status || null
    }

    const StatusBadge = ({ status }: { status: string | null }) => {
        if (!status) return null

        const config = {
            pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Pending Review" },
            verified: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Verified" },
            rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Rejected" },
        }[status]

        if (!config) return null
        const Icon = config.icon

        return (
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </div>
        )
    }

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">Upload Documents</h1>
                        <p className="text-muted-foreground mt-2">
                            Upload the required documents for verification. All documents are securely stored.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Required Documents</CardTitle>
                            <CardDescription>
                                Please upload clear, legible copies of the following documents
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* National ID Front */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <FileUpload
                                        label="National ID (Front)"
                                        description="Upload a clear photo of the front of your ID"
                                        onFileSelect={(file) => {
                                            setNationalIdFront(file)
                                            if (file) handleUpload('national_id_front', file)
                                        }}
                                        currentFile={nationalIdFront}
                                        accept="image/*,application/pdf"
                                    />
                                </div>
                                <div className="pt-8">
                                    <StatusBadge status={getDocumentStatus('national_id_front')} />
                                </div>
                            </div>

                            {/* National ID Back */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <FileUpload
                                        label="National ID (Back)"
                                        description="Upload a clear photo of the back of your ID"
                                        onFileSelect={(file) => {
                                            setNationalIdBack(file)
                                            if (file) handleUpload('national_id_back', file)
                                        }}
                                        currentFile={nationalIdBack}
                                        accept="image/*,application/pdf"
                                    />
                                </div>
                                <div className="pt-8">
                                    <StatusBadge status={getDocumentStatus('national_id_back')} />
                                </div>
                            </div>

                            {/* Payslip */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <FileUpload
                                        label="Recent Payslip"
                                        description="Upload your most recent payslip (within last 3 months)"
                                        onFileSelect={(file) => {
                                            setPayslip(file)
                                            if (file) handleUpload('payslip', file)
                                        }}
                                        currentFile={payslip}
                                        accept="image/*,application/pdf"
                                    />
                                </div>
                                <div className="pt-8">
                                    <StatusBadge status={getDocumentStatus('payslip')} />
                                </div>
                            </div>

                            {/* Proof of Residence */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <FileUpload
                                        label="Proof of Residence"
                                        description="Utility bill or bank statement (within last 3 months)"
                                        onFileSelect={(file) => {
                                            setProofOfResidence(file)
                                            if (file) handleUpload('proof_of_residence', file)
                                        }}
                                        currentFile={proofOfResidence}
                                        accept="image/*,application/pdf"
                                    />
                                </div>
                                <div className="pt-8">
                                    <StatusBadge status={getDocumentStatus('proof_of_residence')} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                            Back to Dashboard
                        </Button>
                        <Button onClick={() => router.push('/dashboard')} disabled={isLoading}>
                            {isLoading && <Spinner className="mr-2" size="sm" />}
                            Continue
                        </Button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
