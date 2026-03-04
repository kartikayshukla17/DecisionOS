import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly supabaseService: SupabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No authorization header');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const user = await this.supabaseService.getUserFromToken(token);
        if (!user) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        let orgId = user.user_metadata?.org_id;

        // Fallback: If org_id is missing in metadata (first login), fetch from DB
        if (!orgId) {
            const adminClient = this.supabaseService.getAdminClient();
            const { data } = await adminClient
                .from('users')
                .select('org_id')
                .eq('id', user.id)
                .single();

            if (data?.org_id) {
                orgId = data.org_id;
            }
        }

        // Standardize user object for controllers
        request.user = {
            id: user.id,
            email: user.email,
            orgId: orgId,
        };

        return true;
    }
}
