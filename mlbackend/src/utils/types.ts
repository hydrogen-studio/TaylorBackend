export interface messageStructure {
    msg: string;
    context?: string;
    botParams: string;
}

export interface intentStructure {
    tag: string,
    patterns: Array<string>,
    responses: Array<string>,
    context: Array<string>
}