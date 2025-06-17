#!/usr/bin/env node

/**
 * Test script for session validation and error handling
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:3000'

// Test cases for invalid session IDs
const testCases = [
  { id: 'undefined', description: 'Testing with "undefined" string' },
  { id: 'null', description: 'Testing with "null" string' },
  { id: '', description: 'Testing with empty string' },
  { id: 'invalid-uuid', description: 'Testing with invalid UUID format' },
  { id: '12345', description: 'Testing with numeric string' }
]

async function testSessionEndpoint(id, endpoint) {
  try {
    const response = await fetch(`${BASE_URL}/api/viral/v2/sessions/${id}${endpoint}`, {
      method: endpoint === '' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: endpoint !== '' ? JSON.stringify({}) : undefined
    })
    
    const data = await response.json()
    
    return {
      status: response.status,
      ok: response.ok,
      error: data.error
    }
  } catch (error) {
    return {
      status: 'network_error',
      ok: false,
      error: error.message
    }
  }
}

async function runTests() {
  console.log('🧪 Testing Session Validation\n')
  console.log('=' .repeat(80))
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.description}`)
    console.log(`ID: "${testCase.id}"`)
    console.log('-'.repeat(40))
    
    // Test GET /sessions/[id]
    const getResult = await testSessionEndpoint(testCase.id, '')
    console.log(`GET /sessions/${testCase.id}:`)
    console.log(`  Status: ${getResult.status}`)
    console.log(`  Error: ${getResult.error || 'none'}`)
    
    // Test POST /sessions/[id]/collect-topics
    const collectResult = await testSessionEndpoint(testCase.id, '/collect-topics')
    console.log(`\nPOST /sessions/${testCase.id}/collect-topics:`)
    console.log(`  Status: ${collectResult.status}`)
    console.log(`  Error: ${collectResult.error || 'none'}`)
    
    // Test POST /sessions/[id]/generate-concepts
    const conceptsResult = await testSessionEndpoint(testCase.id, '/generate-concepts')
    console.log(`\nPOST /sessions/${testCase.id}/generate-concepts:`)
    console.log(`  Status: ${conceptsResult.status}`)
    console.log(`  Error: ${conceptsResult.error || 'none'}`)
    
    // Test POST /sessions/[id]/generate-contents
    const contentsResult = await testSessionEndpoint(testCase.id, '/generate-contents')
    console.log(`\nPOST /sessions/${testCase.id}/generate-contents:`)
    console.log(`  Status: ${contentsResult.status}`)
    console.log(`  Error: ${contentsResult.error || 'none'}`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Validation tests completed\n')
}

// Test valid session creation and navigation
async function testSessionCreation() {
  console.log('\n🧪 Testing Session Creation and Navigation\n')
  console.log('=' .repeat(80))
  
  try {
    // Create a new session
    const createResponse = await fetch(`${BASE_URL}/api/viral/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: 'テストセッション',
        platform: 'Twitter',
        style: 'エンターテイメント'
      })
    })
    
    const createData = await createResponse.json()
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create session:', createData.error)
      return
    }
    
    console.log('✅ Session created successfully')
    console.log(`   ID: ${createData.session.id}`)
    console.log(`   Theme: ${createData.session.theme}`)
    console.log(`   Status: ${createData.session.status}`)
    
    // Test accessing the created session
    const getResponse = await fetch(`${BASE_URL}/api/viral/v2/sessions/${createData.session.id}`)
    const getData = await getResponse.json()
    
    if (getResponse.ok) {
      console.log('\n✅ Session retrieved successfully')
      console.log(`   Status: ${getData.session.status}`)
    } else {
      console.log('\n❌ Failed to retrieve session:', getData.error)
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
  
  console.log('\n' + '='.repeat(80))
}

// Run all tests
async function main() {
  console.log('🚀 Starting Session Validation Tests\n')
  console.log('Make sure the development server is running on http://localhost:3000\n')
  
  await runTests()
  await testSessionCreation()
  
  console.log('\n🎉 All tests completed!')
}

main().catch(console.error)