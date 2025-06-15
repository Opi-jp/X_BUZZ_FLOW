// URLと日付の取得状況を確認
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkUrlsAndDates() {
  const sessionId = 'b721776b-ce78-4921-8b82-831c70541e61';
  
  try {
    const phase1 = await prisma.cotPhase.findFirst({
      where: {
        sessionId: sessionId,
        phaseNumber: 1
      }
    });
    
    if (!phase1) {
      console.error('Phase 1 not found');
      return;
    }
    
    console.log('=' .repeat(80));
    console.log('📊 URL AND DATE EXTRACTION CHECK');
    console.log('=' .repeat(80));
    
    // EXECUTE結果（Perplexity検索結果）を確認
    if (phase1.executeResult) {
      console.log('\n📌 PHASE 1 - EXECUTE (Perplexity Search Results)');
      console.log('-'.repeat(80));
      
      const execute = typeof phase1.executeResult === 'string' 
        ? JSON.parse(phase1.executeResult) 
        : phase1.executeResult;
      
      if (execute.searchResults) {
        execute.searchResults.forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.topic}`);
          console.log(`   Category: ${result.category}`);
          
          // ソース情報の確認
          console.log(`\n   Sources (${result.sources?.length || 0}):`);
          if (result.sources && result.sources.length > 0) {
            result.sources.forEach((source, i) => {
              console.log(`   ${i + 1}. Title: ${source.title || 'N/A'}`);
              console.log(`      URL: ${source.url || 'N/A'}`);
              console.log(`      Date: ${source.date || 'Not extracted'}`);
            });
          } else {
            console.log('   No sources extracted');
          }
          
          // 分析テキストからURLやソースを探す
          if (result.analysis) {
            const urlMatches = result.analysis.match(/https?:\/\/[^\s\]]+/g);
            const sourceMatches = result.analysis.match(/\[(\d+)\]/g);
            console.log(`\n   URLs found in analysis text: ${urlMatches?.length || 0}`);
            if (urlMatches) {
              urlMatches.slice(0, 3).forEach((url, i) => {
                console.log(`   - ${url}`);
              });
            }
            console.log(`   Source references found: ${sourceMatches?.length || 0}`);
          }
        });
      }
    }
    
    // INTEGRATE結果（統合されたトピック）を確認
    if (phase1.integrateResult) {
      console.log('\n\n📌 PHASE 1 - INTEGRATE (Trended Topics)');
      console.log('-'.repeat(80));
      
      const integrate = typeof phase1.integrateResult === 'string' 
        ? JSON.parse(phase1.integrateResult) 
        : phase1.integrateResult;
      
      if (integrate.trendedTopics) {
        integrate.trendedTopics.forEach((topic, index) => {
          console.log(`\n${index + 1}. ${topic.topicName}`);
          
          console.log(`\n   Sources (${topic.sources?.length || 0}):`);
          if (topic.sources && topic.sources.length > 0) {
            topic.sources.forEach((source, i) => {
              console.log(`   ${i + 1}. Title: ${source.title || 'N/A'}`);
              console.log(`      URL: ${source.url || 'N/A'}`);
              console.log(`      Date: ${source.date || 'Not extracted'}`);
            });
          } else {
            console.log('   No sources preserved in integrate phase');
          }
        });
      }
    }
    
    // 実際のPerplexity応答を一部表示して、日付情報が含まれているか確認
    if (phase1.executeResult) {
      console.log('\n\n📌 SAMPLE PERPLEXITY RESPONSE (First 1000 chars)');
      console.log('-'.repeat(80));
      
      const execute = typeof phase1.executeResult === 'string' 
        ? JSON.parse(phase1.executeResult) 
        : phase1.executeResult;
      
      if (execute.searchResults?.[0]?.analysis) {
        const sample = execute.searchResults[0].analysis.substring(0, 1000);
        console.log(sample);
        
        // 日付パターンを探す
        const datePatterns = [
          /\d{4}年\d{1,2}月\d{1,2}日/g,
          /\d{1,2}月\d{1,2}日/g,
          /\d{4}\/\d{1,2}\/\d{1,2}/g,
          /\d{4}-\d{1,2}-\d{1,2}/g,
          /January|February|March|April|May|June|July|August|September|October|November|December \d{1,2}, \d{4}/gi
        ];
        
        console.log('\n   Date patterns found:');
        datePatterns.forEach((pattern) => {
          const matches = sample.match(pattern);
          if (matches) {
            console.log(`   - ${pattern.source}: ${matches.join(', ')}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUrlsAndDates();