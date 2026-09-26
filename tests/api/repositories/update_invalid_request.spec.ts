import { test, expect } from '../../../fixtures/basefixture';

import updateRepositoryRequestSchema from '../../../schemas/update-repository-request.schema.json';

import { validateSchema } from '../../../utils/schemaValidator';

test(
    'Reject invalid GitHub repository update request payload',
    async () => {
        const invalidUpdatePayload = {
            description: 12345,
        };

        await test.step(
            'Validate invalid update request payload schema',
            async () => {
                expect(() =>
                    validateSchema(
                        updateRepositoryRequestSchema,
                        invalidUpdatePayload,
                        'GitHub Repository Update Request'
                    )
                ).toThrow(
                    /JSON Schema validation failed for GitHub Repository Update Request/
                );
            }
        );

        console.log(
            '✅ Invalid update payload was rejected before API request.'
        );
    }
);