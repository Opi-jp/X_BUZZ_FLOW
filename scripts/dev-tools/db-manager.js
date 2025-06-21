#!/usr/bin/env node

/**
 * 統合データベース管理ツール
 * 
 * 使い方:
 * - node scripts/db-manager.js status    # 現在の状態を確認
 * - node scripts/db-manager.js migrate   # 必要なマイグレーションを実行
 * - node scripts/db-manager.js check     # スキーマの整合性をチェック
 * - node scripts/db-manager.js fix       # 不足しているカラムやテーブルを修正
 */

const { PrismaClient } = require('../../lib/generated/prisma')
const { readFileSync } = require('fs')
const { join } = require('path')

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient()
    this.requiredTables = this.loadRequiredSchema()
  }
  
  // 必要なスキーマ定義を読み込む
  loadRequiredSchema() {
    return {
      // 統合システムで必要なテーブル
      scheduled_retweets: {
        columns: {
          id: 'TEXT PRIMARY KEY',
          original_post_id: 'TEXT NOT NULL',
          original_content: 'TEXT NOT NULL',
          scheduled_at: 'TIMESTAMP(3) NOT NULL',
          status: 'rt_status NOT NULL DEFAULT \'SCHEDULED\'',
          rt_strategy: 'TEXT NOT NULL',
          add_comment: 'BOOLEAN NOT NULL DEFAULT false',
          comment_text: 'TEXT',
          viral_draft_id: 'TEXT',
          cot_draft_id: 'TEXT',
          executed_at: 'TIMESTAMP(3)',
          rt_post_id: 'TEXT',
          error: 'TEXT',
          created_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
          updated_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
        },
        indexes: [
          'CREATE INDEX scheduled_retweets_status_scheduled_at_idx ON scheduled_retweets(status, scheduled_at)',
          'CREATE INDEX scheduled_retweets_original_post_id_idx ON scheduled_retweets(original_post_id)'
        ]
      },
      
      unified_performance: {
        columns: {
          id: 'TEXT PRIMARY KEY',
          content_id: 'TEXT NOT NULL UNIQUE',
          content_type: 'TEXT NOT NULL',
          metrics_30m: 'JSONB',
          metrics_1h: 'JSONB',
          metrics_24h: 'JSONB',
          engagement_rate: 'DOUBLE PRECISION',
          viral_coefficient: 'DOUBLE PRECISION',
          collected_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
          updated_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
        }
      },
      
      news_viral_relations: {
        columns: {
          id: 'TEXT PRIMARY KEY',
          news_id: 'TEXT NOT NULL',
          session_id: 'TEXT NOT NULL',
          relevance_score: 'DOUBLE PRECISION',
          used_in_content: 'BOOLEAN NOT NULL DEFAULT false',
          created_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
        },
        constraints: [
          'CONSTRAINT news_viral_relations_unique UNIQUE (news_id, session_id)'
        ]
      },
      
      session_activity_logs: {
        columns: {
          id: 'TEXT PRIMARY KEY',
          session_id: 'TEXT NOT NULL',
          session_type: 'TEXT NOT NULL',
          activity_type: 'TEXT NOT NULL',
          details: 'JSONB',
          created_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
        },
        indexes: [
          'CREATE INDEX session_activity_logs_session_id_idx ON session_activity_logs(session_id)',
          'CREATE INDEX session_activity_logs_created_at_idx ON session_activity_logs(created_at)'
        ]
      },
      
      api_error_logs: {
        columns: {
          id: 'TEXT PRIMARY KEY',
          endpoint: 'TEXT NOT NULL',
          method: 'TEXT NOT NULL',
          status_code: 'INTEGER NOT NULL',
          error_message: 'TEXT',
          stack_trace: 'TEXT',
          request_body: 'JSONB',
          request_headers: 'JSONB',
          user_agent: 'TEXT',
          ip_address: 'TEXT',
          created_at: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
        },
        indexes: [
          'CREATE INDEX api_error_logs_endpoint_idx ON api_error_logs(endpoint)',
          'CREATE INDEX api_error_logs_status_code_idx ON api_error_logs(status_code)',
          'CREATE INDEX api_error_logs_created_at_idx ON api_error_logs(created_at)'
        ]
      }
    }
  }
  
  // 既存テーブルの拡張が必要なカラム
  get tableExtensions() {
    return {
      character_profiles: {
        preferred_news_categories: 'TEXT[] DEFAULT \'{}\'',
        news_comment_style: 'JSONB',
        topic_expertise: 'JSONB'
      },
      viral_drafts: {
        source_url: 'TEXT',
        news_article_id: 'TEXT'
      },
      news_articles: {
        category: 'TEXT',
        importance: 'DOUBLE PRECISION'
      },
      api_tasks: {
        task_type: 'TEXT NOT NULL DEFAULT \'unknown\''
      }
    }
  }
  
  // 必要なEnum型
  get requiredEnums() {
    return {
      rt_status: ['SCHEDULED', 'EXECUTED', 'FAILED', 'CANCELLED']
    }
  }
  
  async checkStatus() {
    console.log('📊 データベースの状態を確認中...\n')
    
    try {
      // Enum型の確認
      console.log('🔍 Enum型の確認:')
      for (const [enumName, values] of Object.entries(this.requiredEnums)) {
        const exists = await this.checkEnumExists(enumName)
        console.log(`  ${exists ? '✅' : '❌'} ${enumName}`)
      }
      
      // テーブルの確認
      console.log('\n🔍 テーブルの確認:')
      for (const tableName of Object.keys(this.requiredTables)) {
        const exists = await this.checkTableExists(tableName)
        console.log(`  ${exists ? '✅' : '❌'} ${tableName}`)
      }
      
      // 拡張カラムの確認
      console.log('\n🔍 拡張カラムの確認:')
      for (const [tableName, columns] of Object.entries(this.tableExtensions)) {
        const tableExists = await this.checkTableExists(tableName)
        if (tableExists) {
          console.log(`  ${tableName}:`)
          for (const columnName of Object.keys(columns)) {
            const exists = await this.checkColumnExists(tableName, columnName)
            console.log(`    ${exists ? '✅' : '❌'} ${columnName}`)
          }
        } else {
          console.log(`  ⚠️  ${tableName} テーブルが存在しません`)
        }
      }
      
    } catch (error) {
      console.error('❌ ステータス確認中にエラーが発生しました:', error.message)
    }
  }
  
  async migrate() {
    console.log('🚀 必要なマイグレーションを実行中...\n')
    
    try {
      // 1. Enum型の作成
      for (const [enumName, values] of Object.entries(this.requiredEnums)) {
        if (!(await this.checkEnumExists(enumName))) {
          console.log(`Creating enum ${enumName}...`)
          await this.createEnum(enumName, values)
          console.log(`✅ ${enumName} enum created`)
        }
      }
      
      // 2. テーブルの作成
      for (const [tableName, schema] of Object.entries(this.requiredTables)) {
        if (!(await this.checkTableExists(tableName))) {
          console.log(`\nCreating table ${tableName}...`)
          await this.createTable(tableName, schema)
          console.log(`✅ ${tableName} table created`)
        }
      }
      
      // 3. カラムの拡張
      for (const [tableName, columns] of Object.entries(this.tableExtensions)) {
        if (await this.checkTableExists(tableName)) {
          for (const [columnName, definition] of Object.entries(columns)) {
            if (!(await this.checkColumnExists(tableName, columnName))) {
              console.log(`Adding column ${columnName} to ${tableName}...`)
              await this.addColumn(tableName, columnName, definition)
              console.log(`✅ ${columnName} added`)
            }
          }
        }
      }
      
      // 4. トリガーの作成
      await this.createUpdateTriggers()
      
      console.log('\n✅ マイグレーションが完了しました！')
      
    } catch (error) {
      console.error('❌ マイグレーション中にエラーが発生しました:', error.message)
      throw error
    }
  }
  
  async fix() {
    console.log('🔧 スキーマの問題を修正中...\n')
    await this.migrate()
  }
  
  // ヘルパーメソッド
  async checkEnumExists(enumName) {
    const result = await this.prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = ${enumName}
      ) as exists
    `
    return result[0].exists
  }
  
  async checkTableExists(tableName) {
    const result = await this.prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `
    return result[0].exists
  }
  
  async checkColumnExists(tableName, columnName) {
    const result = await this.prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      ) as exists
    `
    return result[0].exists
  }
  
  async createEnum(enumName, values) {
    const valuesList = values.map(v => `'${v}'`).join(', ')
    await this.prisma.$executeRawUnsafe(`
      CREATE TYPE ${enumName} AS ENUM (${valuesList})
    `)
  }
  
  async createTable(tableName, schema) {
    // カラム定義
    const columns = Object.entries(schema.columns)
      .map(([name, def]) => `${name} ${def}`)
      .join(',\n        ')
    
    // 制約
    const constraints = schema.constraints || []
    const constraintStr = constraints.length > 0 
      ? ',\n        ' + constraints.join(',\n        ')
      : ''
    
    // テーブル作成
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE ${tableName} (
        ${columns}${constraintStr}
      )
    `)
    
    // インデックス作成
    if (schema.indexes) {
      for (const index of schema.indexes) {
        await this.prisma.$executeRawUnsafe(index)
      }
    }
  }
  
  async addColumn(tableName, columnName, definition) {
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE ${tableName} 
      ADD COLUMN IF NOT EXISTS ${columnName} ${definition}
    `)
  }
  
  async createUpdateTriggers() {
    // トリガー関数
    await this.prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `
    
    // 各テーブルにトリガーを適用
    const tablesWithUpdatedAt = [
      'scheduled_retweets',
      'unified_performance',
      'news_articles'
    ]
    
    for (const table of tablesWithUpdatedAt) {
      if (await this.checkTableExists(table)) {
        await this.prisma.$executeRawUnsafe(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}
        `)
        await this.prisma.$executeRawUnsafe(`
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `)
      }
    }
  }
  
  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// CLI実行
async function main() {
  const command = process.argv[2]
  const manager = new DatabaseManager()
  
  try {
    switch (command) {
      case 'status':
        await manager.checkStatus()
        break
        
      case 'migrate':
        await manager.migrate()
        break
        
      case 'check':
        await manager.checkStatus()
        break
        
      case 'fix':
        await manager.fix()
        break
        
      default:
        console.log(`
📚 データベース管理ツール

使い方:
  node scripts/db-manager.js <command>

コマンド:
  status    現在のデータベース状態を確認
  migrate   必要なマイグレーションを実行
  check     スキーマの整合性をチェック
  fix       不足しているカラムやテーブルを修正
        `)
    }
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await manager.disconnect()
  }
}

main()