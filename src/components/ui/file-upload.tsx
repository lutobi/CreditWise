"use client"

import * as React from "react"
import { Upload, X, FileText, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface FileUploadProps {
    onFileSelect: (file: File) => void
    accept?: string
    maxSize?: number // in bytes
    currentFile?: File | null
    label: string
    description?: string
    error?: string
}

export function FileUpload({
    onFileSelect,
    accept = "image/*,application/pdf",
    maxSize = 5 * 1024 * 1024, // 5MB default
    currentFile,
    label,
    description,
    error
}: FileUploadProps) {
    const [isDragging, setIsDragging] = React.useState(false)
    const [preview, setPreview] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        if (currentFile && currentFile.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(currentFile)
        } else {
            setPreview(null)
        }
    }, [currentFile])

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            handleFile(files[0])
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            handleFile(files[0])
        }
    }

    const handleFile = (file: File) => {
        // Validate file size
        if (file.size > maxSize) {
            return
        }

        // Validate file type
        const acceptedTypes = accept.split(',')
            .map(t => t.trim())
        const isValidType = acceptedTypes.some(type => {
            if (type.endsWith('/*')) {
                const category = type.split('/')[0]
                return file.type.startsWith(category + '/')
            }
            return file.type === type
        })

        if (!isValidType) {
            return
        }

        onFileSelect(file)
    }

    const removeFile = () => {
        onFileSelect(null as any)
        setPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
                    isDragging && "border-primary bg-primary/5",
                    error && "border-red-500",
                    !error && !isDragging && "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileInput}
                    className="hidden"
                />

                {currentFile ? (
                    <div className="flex items-center gap-4">
                        {preview ? (
                            <img src={preview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                        ) : (
                            <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{currentFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {(currentFile.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeFile()
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                PDF, JPG, or PNG (max {(maxSize / 1024 / 1024).toFixed(0)}MB)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    )
}
