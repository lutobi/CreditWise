import { supabase } from './supabase'

export type DocumentType = 'national_id_front' | 'national_id_back' | 'payslip' | 'proof_of_residence'

export interface DocumentUpload {
    documentType: DocumentType
    file: File
}

export interface Document {
    id: string
    user_id: string
    document_type: DocumentType
    file_path: string
    file_name: string
    file_size: number
    mime_type: string
    status: 'pending' | 'verified' | 'rejected'
    rejection_reason?: string
    uploaded_at: string
    verified_at?: string
    verified_by?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export async function uploadDocument(userId: string, documentType: DocumentType, file: File): Promise<{ success: boolean; error?: string; document?: Document }> {
    try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, error: 'File size must be less than 5MB' }
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return { success: false, error: 'File type must be PDF, JPG, or PNG' }
        }

        // Generate file path: {user_id}/{document_type}.{extension}
        const fileExt = file.name.split('.').pop()
        const fileName = `${documentType}.${fileExt}`
        const filePath = `${userId}/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                upsert: true, // Replace if exists
                contentType: file.type,
            })

        if (uploadError) {
            return { success: false, error: uploadError.message }
        }

        // Save metadata to database
        const { data: document, error: dbError } = await supabase
            .from('documents')
            .upsert({
                user_id: userId,
                document_type: documentType,
                file_path: uploadData.path,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                status: 'pending',
            })
            .select()
            .single()

        if (dbError) {
            return { success: false, error: dbError.message }
        }

        return { success: true, document }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getUserDocuments(userId: string): Promise<{ success: boolean; documents?: Document[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', userId)
            .order('uploaded_at', { ascending: false })

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, documents: data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getDocumentUrl(filePath: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(filePath, 3600) // 1 hour expiry

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, url: data.signedUrl }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteDocument(documentId: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([filePath])

        if (storageError) {
            return { success: false, error: storageError.message }
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)

        if (dbError) {
            return { success: false, error: dbError.message }
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
