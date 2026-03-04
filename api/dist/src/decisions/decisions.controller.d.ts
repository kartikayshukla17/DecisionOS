import { DecisionsService } from '../decisions.service';
export declare class DecisionsController {
    private readonly decisionsService;
    constructor(decisionsService: DecisionsService);
    getQueue(req: any): Promise<{
        id: any;
        title: any;
        summary: any;
        status: any;
        source_platform: any;
        created_at: any;
        commitments: {
            id: any;
            description: any;
            owner_name: any;
            status: any;
        }[];
    }[]>;
    draftResponse(req: any, body: any): Promise<{
        draft: string | undefined;
        sources: any;
    }>;
    createDecision(req: any, body: any): Promise<{
        id: any;
        title: any;
        status: any;
        created_at: any;
    }>;
}
