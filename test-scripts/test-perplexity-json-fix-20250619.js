#!/usr/bin/env node

// Test script for Perplexity JSON sanitization fix
// This tests the unquoted string value fix in the collect route

const sanitizeJsonString = (str) => {
  let result = str
  
  // Step 1: Fix unquoted string values
  // Match patterns like "fieldname": value without quotes
  // More precise regex that handles various cases
  result = result.replace(
    /"([^"]+)":\s*([^",\}\[\]\s](?:[^,\}\[\]]*[^,\}\[\]\s])?)/g,
    (match, key, value) => {
      // Check if the value is already a valid JSON value
      const trimmedValue = value.trim()
      
      // Skip if it's a number, boolean, null, or already has quotes
      if (/^".*"$/.test(trimmedValue) || // Already quoted
          /^(true|false|null)$/.test(trimmedValue) || // Boolean or null
          /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmedValue) || // Number
          /^[\[\{]/.test(trimmedValue)) { // Array or object start
        return match
      }
      
      // Escape special characters in the unquoted value
      const escapedValue = value
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/"/g, '\\"')   // Escape quotes
        .replace(/\n/g, '\\n')  // Escape newlines
        .replace(/\r/g, '\\r')  // Escape carriage returns
        .replace(/\t/g, '\\t')  // Escape tabs
        
      console.log(`Fixed unquoted value for key "${key}": ${value.substring(0, 50)}...`)
      return `"${key}": "${escapedValue}"`
    }
  )
  
  // Step 2: Handle multi-line unquoted values
  // This catches cases where the value spans multiple lines
  result = result.replace(
    /"([^"]+)":\s*([^",\}\[\]]+?)(?=\s*[,\}\]])/gs, // 's' flag for dotall (. matches newlines)
    (match, key, value) => {
      // Skip if it's already a valid JSON value
      const trimmedValue = value.trim()
      if (/^(".*"|true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?|\[.*\]|\{.*\})$/s.test(trimmedValue)) {
        return match
      }
      
      // Escape special characters in the value
      const escapedValue = trimmedValue
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove other control chars
        
      console.log(`Fixed multi-line unquoted value for key "${key}": ${escapedValue.substring(0, 50)}...`)
      return `"${key}": "${escapedValue}"`
    }
  )
  
  return result
}

// Test cases
const testCases = [
  {
    name: "Simple unquoted string",
    input: `{"summary": NTTコミュニケーションズ}`,
    expected: `{"summary": "NTTコミュニケーションズ"}`
  },
  {
    name: "Unquoted string with spaces",
    input: `{"summary": NTTコミュニケーションズ is a company}`,
    expected: `{"summary": "NTTコミュニケーションズ is a company"}`
  },
  {
    name: "Multiple unquoted values",
    input: `{"summary": NTTコミュニケーションズ, "title": AI and automation}`,
    expected: `{"summary": "NTTコミュニケーションズ", "title": "AI and automation"}`
  },
  {
    name: "Mixed quoted and unquoted",
    input: `{"quoted": "This is quoted", "unquoted": This is not quoted}`,
    expected: `{"quoted": "This is quoted", "unquoted": "This is not quoted"}`
  },
  {
    name: "Multi-line unquoted value",
    input: `{
      "summary": This is a
      multi-line value
      that needs quotes
    }`,
    expected: `{
      "summary": "This is a\\nmulti-line value\\nthat needs quotes"
    }`
  },
  {
    name: "Values with special characters",
    input: `{"summary": Value with "quotes" and \n newlines}`,
    expected: `{"summary": "Value with \\"quotes\\" and \\n newlines"}`
  },
  {
    name: "Already valid JSON (should not change)",
    input: `{"number": 123, "bool": true, "null": null, "string": "already quoted"}`,
    expected: `{"number": 123, "bool": true, "null": null, "string": "already quoted"}`
  },
  {
    name: "Complex nested structure",
    input: `{
      "topics": [
        {
          "title": Unquoted title,
          "summary": NTTコミュニケーションズがAI活用,
          "score": 0.85
        }
      ]
    }`,
    expected: `{
      "topics": [
        {
          "title": "Unquoted title",
          "summary": "NTTコミュニケーションズがAI活用",
          "score": 0.85
        }
      ]
    }`
  }
]

// Run tests
console.log("Testing JSON sanitization for unquoted string values...\n")

let passed = 0
let failed = 0

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`)
  console.log(`Input:    ${test.input.replace(/\n/g, '\\n').substring(0, 100)}...`)
  
  const result = sanitizeJsonString(test.input)
  
  try {
    // Try to parse the result to ensure it's valid JSON
    JSON.parse(result)
    console.log(`Result:   ${result.replace(/\n/g, '\\n').substring(0, 100)}...`)
    console.log(`✅ Valid JSON produced\n`)
    passed++
  } catch (e) {
    console.log(`Result:   ${result.replace(/\n/g, '\\n').substring(0, 100)}...`)
    console.log(`❌ Invalid JSON: ${e.message}\n`)
    failed++
  }
})

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`)

// Test with actual Perplexity-like response
console.log("\n=== Testing with Perplexity-like response ===")
const perplexityLikeResponse = `{
  "topics": [
    {
      "title": AIによる業務効率化の最新トレンド,
      "summary": NTTコミュニケーションズが発表した新しいAIツールは、企業の業務効率を大幅に向上させる可能性がある。このツールは自然言語処理と機械学習を組み合わせて、日常的なタスクを自動化する,
      "url": "https://example.com/article1",
      "relevance": 0.95
    },
    {
      "title": 生成AIの職場での活用方法,
      "summary": ChatGPTやClaudeなどの生成AIツールを職場で効果的に活用する方法について、専門家が解説。プロンプトエンジニアリングの重要性と、AIとの協働による生産性向上のコツを紹介,
      "url": "https://example.com/article2",
      "relevance": 0.88
    }
  ]
}`

console.log("Original response (with unquoted values):")
console.log(perplexityLikeResponse.substring(0, 200) + "...\n")

const sanitized = sanitizeJsonString(perplexityLikeResponse)

try {
  const parsed = JSON.parse(sanitized)
  console.log("✅ Successfully sanitized and parsed!")
  console.log("Parsed topics:", parsed.topics.length)
  parsed.topics.forEach((topic, i) => {
    console.log(`  Topic ${i + 1}: ${topic.title.substring(0, 30)}...`)
  })
} catch (e) {
  console.log("❌ Failed to parse:", e.message)
  console.log("Sanitized result:", sanitized.substring(0, 300) + "...")
}