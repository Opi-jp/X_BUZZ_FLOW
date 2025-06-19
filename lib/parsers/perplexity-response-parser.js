"use strict";
/**
 * Perplexityレスポンスパーサー
 * Markdown形式で返されるPerplexityのレスポンスからJSONを抽出する
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerplexityResponseParser = void 0;
class PerplexityResponseParser {
    /**
     * Markdown形式のレスポンスからトピックを抽出
     */
    static parseTopics(markdownResponse) {
        if (!markdownResponse || typeof markdownResponse !== 'string') {
            throw new Error('Invalid response: expected string');
        }
        console.log('Parsing Perplexity response, length:', markdownResponse.length);
        const topics = [];
        // コードブロック内のJSONを抽出
        // ```で囲まれたブロックを探す（前後の空白も考慮）
        const codeBlockRegex = /```\s*(?:json)?\s*\n([\s\S]*?)\n```/g;
        let match;
        while ((match = codeBlockRegex.exec(markdownResponse)) !== null) {
            const jsonContent = match[1].trim();
            console.log('Found code block, first 100 chars:', jsonContent.substring(0, 100));
            try {
                // JSONパース前に改行文字の処理
                // summary内の改行を\\nにエスケープ
                let processedJson = jsonContent;
                // "summary": "..." の中の実際の改行を \n にエスケープ
                processedJson = processedJson.replace(/"summary":\s*"([^"]*(?:\n[^"]*)*?)"/g, (match, content) => {
                    const escaped = content.replace(/\n/g, '\\n');
                    return `"summary": "${escaped}"`;
                });
                // "perplexityAnalysis": "..." の中の改行も同様に処理
                processedJson = processedJson.replace(/"perplexityAnalysis":\s*"([^"]*(?:\n[^"]*)*?)"/g, (match, content) => {
                    const escaped = content.replace(/\n/g, '\\n');
                    return `"perplexityAnalysis": "${escaped}"`;
                });
                // JSONをパース
                const topic = JSON.parse(processedJson);
                // 必須フィールドの検証
                this.validateTopic(topic);
                topics.push(topic);
            }
            catch (error) {
                console.error('Failed to parse JSON block:', error);
                console.error('JSON content:', jsonContent.substring(0, 200) + '...');
                // パースエラーでも処理を続行（他のトピックは正常かもしれない）
            }
        }
        console.log('Total topics parsed:', topics.length);
        if (topics.length === 0) {
            console.error('No topics found. Response preview:', markdownResponse.substring(0, 500));
            throw new Error('No valid topics found in response');
        }
        return topics;
    }
    /**
     * トピックの必須フィールドを検証
     */
    static validateTopic(topic) {
        const requiredFields = [
            'TOPIC',
            'title',
            'source',
            'url',
            'date',
            'summary',
            'keyPoints',
            'perplexityAnalysis'
        ];
        for (const field of requiredFields) {
            if (!topic[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        // keyPointsは配列である必要がある
        if (!Array.isArray(topic.keyPoints)) {
            throw new Error('keyPoints must be an array');
        }
        // 文字数の検証
        if (topic.summary.length < 350 || topic.summary.length > 450) {
            console.warn(`Summary length out of range: ${topic.summary.length} characters`);
        }
        if (topic.perplexityAnalysis.length < 150 || topic.perplexityAnalysis.length > 250) {
            console.warn(`PerplexityAnalysis length out of range: ${topic.perplexityAnalysis.length} characters`);
        }
    }
    /**
     * 旧形式のレスポンスを処理（後方互換性のため）
     */
    static parseLegacyFormat(response) {
        // レスポンスがオブジェクトで、parsedプロパティを持つ場合
        if (response && typeof response === 'object' && response.parsed) {
            return response.parsed;
        }
        // その他の形式はエラー
        throw new Error('Unsupported response format');
    }
}
exports.PerplexityResponseParser = PerplexityResponseParser;
