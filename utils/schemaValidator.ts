import Ajv from 'ajv';

const ajv = new Ajv({
    allErrors: true,
    strict: true,
});

export function validateSchema(
    schema: object,
    data: unknown,
    schemaName: string
): void {
    const validate = ajv.compile(schema);

    const isValid = validate(data);

    if (!isValid) {
        const errors =
            validate.errors
                ?.map((error) => {
                    const path =
                        error.instancePath || '/';

                    return `${path} ${error.message ?? ''}`;
                })
                .join('\n') ??
            'Unknown schema validation error';

        throw new Error(
            `JSON Schema validation failed for ${schemaName}:\n${errors}`
        );
    }

    console.log(
        `✅ JSON Schema validation passed: ${schemaName}`
    );
}