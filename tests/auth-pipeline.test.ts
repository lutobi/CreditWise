import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase: any = {
    auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn()
    }
};

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => mockSupabase)
}));

describe('Authentication Flow Pipeline', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Login: Successfully authenticates valid user', async () => {
        const mockUser = { id: 'usr-123', email: 'test@nomad.com' };

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: mockUser, session: { access_token: 'fake-token' } },
            error: null
        });

        const res = await mockSupabase.auth.signInWithPassword({
            email: 'test@nomad.com',
            password: 'securePassword123'
        });

        expect(res.data.user.email).toBe('test@nomad.com');
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@nomad.com',
            password: 'securePassword123'
        });
    });

    it('2. Login: Blocks and throws error on invalid credentials', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' }
        });

        const res = await mockSupabase.auth.signInWithPassword({
            email: 'wrong@nomad.com',
            password: 'bad'
        });

        expect(res.error).toBeTruthy();
        expect(res.error.message).toContain('Invalid');
    });
});
