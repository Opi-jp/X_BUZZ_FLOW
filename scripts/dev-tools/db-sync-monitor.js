#!/usr/bin/env node

const { PrismaClient } = require('../../lib/generated/prisma');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

class DBSyncMonitor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.status = {
      implementation: { checked: false, issues: 0 },
      schema: { checked: false, issues: 0 },
      database: { checked: false, issues: 0 },
      sync: { checked: false, issues: 0 }
    };
  }

  async monitor() {
    console.log(chalk.bold.blue('\n🔍 DB同期監視システム\n'));
    console.log(chalk.cyan('実装・スキーマ・DBの3層同期状態をチェックします...\n'));

    try {
      // 1. 実装レイヤーのチェック
      await this.checkImplementationLayer();
      
      // 2. スキーマレイヤーのチェック
      await this.checkSchemaLayer();
      
      // 3. DBレイヤーのチェック
      await this.checkDatabaseLayer();
      
      // 4. 3層間の同期チェック
      await this.checkSynchronization();
      
      // 5. レポート生成
      await this.generateReport();
      
    } catch (error) {
      console.error(chalk.red('\n❌ エラー:'), error.message);
    } finally {
      await prisma.$disconnect();
    }
  }

  async checkImplementationLayer() {
    console.log(chalk.yellow('\n📂 実装レイヤーチェック...'));
    
    // Prismaクライアントの使用箇所を検索
    const apiDir = path.join(process.cwd(), 'app', 'api');
    const libDir = path.join(process.cwd(), 'lib');
    
    const prismaUsages = new Map();
    const modelUsages = new Map();
    
    // APIディレクトリをスキャン
    await this.scanDirectory(apiDir, prismaUsages, modelUsages);
    await this.scanDirectory(libDir, prismaUsages, modelUsages);
    
    // 使用されているモデルとフィールドを集計
    const usedModels = new Set();
    const usedOperations = new Map(); // モデル別の使用操作
    const usedFields = new Set();     // 全体で使用されているフィールド
    
    for (const [file, fileData] of modelUsages) {
      // モデルを集計
      fileData.models.forEach(model => usedModels.add(model));
      
      // 操作を集計
      for (const [model, ops] of fileData.operations) {
        if (!usedOperations.has(model)) {
          usedOperations.set(model, new Set());
        }
        ops.forEach(op => usedOperations.get(model).add(op));
      }
      
      // フィールドを集計
      if (fileData.fields.has('_all')) {
        fileData.fields.get('_all').forEach(field => usedFields.add(field));
      }
    }
    
    console.log(chalk.green(`  ✓ ${usedModels.size} モデルが実装で使用中`));
    console.log(chalk.gray(`    主要モデル: ${Array.from(usedModels).slice(0, 5).join(', ')}...`));
    
    // 主要な操作を表示
    const topOperations = [];
    for (const [model, ops] of usedOperations) {
      if (ops.size > 3) {
        topOperations.push(`${model}(${ops.size}操作)`);
      }
    }
    if (topOperations.length > 0) {
      console.log(chalk.gray(`    頻繁に使用: ${topOperations.slice(0, 3).join(', ')}`));
    }
    
    console.log(chalk.green(`  ✓ ${usedFields.size} フィールドが参照されています`));
    
    this.status.implementation.checked = true;
    this.status.implementation.usedModels = usedModels;
    this.status.implementation.usedOperations = usedOperations;
    this.status.implementation.usedFields = usedFields;
  }

  async scanDirectory(dir, prismaUsages, modelUsages) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          await this.scanDirectory(fullPath, prismaUsages, modelUsages);
        } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
          await this.scanFile(fullPath, prismaUsages, modelUsages);
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  }

  async scanFile(filePath, prismaUsages, modelUsages) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // prisma.モデル名.メソッド のパターンを検索
      const modelMethodRegex = /prisma\.(\w+)\.(\w+)/g;
      const matches = content.matchAll(modelMethodRegex);
      
      const fileData = {
        models: new Set(),
        operations: new Map(), // モデル別の操作
        fields: new Map()      // モデル別の使用フィールド
      };
      
      for (const match of matches) {
        const modelName = match[1];
        const method = match[2];
        
        // $で始まるものは除外（$queryRaw, $disconnect等）
        if (!modelName.startsWith('$')) {
          fileData.models.add(modelName);
          
          // 操作を記録
          if (!fileData.operations.has(modelName)) {
            fileData.operations.set(modelName, new Set());
          }
          fileData.operations.get(modelName).add(method);
        }
      }
      
      // フィールド使用の検索（where, data, select, include内）
      const fieldPatterns = [
        /where:\s*{([^}]+)}/g,
        /data:\s*{([^}]+)}/g,
        /select:\s*{([^}]+)}/g,
        /include:\s*{([^}]+)}/g,
        /orderBy:\s*{([^}]+)}/g
      ];
      
      for (const pattern of fieldPatterns) {
        const fieldMatches = content.matchAll(pattern);
        for (const match of fieldMatches) {
          const fieldsContent = match[1];
          // フィールド名を抽出（簡易的）
          const fieldRegex = /(\w+):/g;
          const fields = fieldsContent.matchAll(fieldRegex);
          
          for (const field of fields) {
            const fieldName = field[1];
            // どのモデルのフィールドかは前後のコンテキストから推測
            // ここでは簡易的にファイル全体のフィールドとして記録
            if (!fileData.fields.has('_all')) {
              fileData.fields.set('_all', new Set());
            }
            fileData.fields.get('_all').add(fieldName);
          }
        }
      }
      
      if (fileData.models.size > 0) {
        modelUsages.set(filePath, fileData);
      }
    } catch (error) {
      // ファイル読み込みエラーは無視
    }
  }

  async checkSchemaLayer() {
    console.log(chalk.yellow('\n📋 スキーマレイヤーチェック...'));
    
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    
    // モデルを抽出
    const models = new Map();
    const enums = new Map();
    
    const lines = schemaContent.split('\n');
    let currentModel = null;
    let currentEnum = null;
    let inModel = false;
    let inEnum = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // モデル開始
      if (line.match(/^model\s+(\w+)\s*\{/)) {
        const match = line.match(/^model\s+(\w+)/);
        if (match) {
          currentModel = {
            name: match[1],
            tableName: null,
            fields: new Map()
          };
          inModel = true;
        }
      }
      
      // Enum開始
      if (line.match(/^enum\s+(\w+)\s*\{/)) {
        const match = line.match(/^enum\s+(\w+)/);
        if (match) {
          currentEnum = {
            name: match[1],
            dbName: null,
            values: []
          };
          inEnum = true;
        }
      }
      
      // @@map
      if (inModel && currentModel && trimmed.includes('@@map(')) {
        const mapMatch = trimmed.match(/@@map\("([^"]+)"\)/);
        if (mapMatch) {
          currentModel.tableName = mapMatch[1];
        }
      }
      
      if (inEnum && currentEnum && trimmed.includes('@@map(')) {
        const mapMatch = trimmed.match(/@@map\("([^"]+)"\)/);
        if (mapMatch) {
          currentEnum.dbName = mapMatch[1];
        }
      }
      
      // フィールド
      if (inModel && currentModel && !trimmed.startsWith('@@') && trimmed.includes(' ') && !trimmed.startsWith('//')) {
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          
          // @map チェック
          let dbFieldName = fieldName;
          const mapMatch = trimmed.match(/@map\("([^"]+)"\)/);
          if (mapMatch) {
            dbFieldName = mapMatch[1];
          }
          
          currentModel.fields.set(fieldName, {
            name: fieldName,
            dbName: dbFieldName,
            type: fieldType,
            isOptional: fieldType.includes('?'),
            isArray: fieldType.includes('[]')
          });
        }
      }
      
      // モデル/Enum終了
      if ((inModel || inEnum) && line.trim() === '}') {
        if (inModel && currentModel) {
          if (!currentModel.tableName) {
            // デフォルトのテーブル名（snake_case）
            currentModel.tableName = currentModel.name
              .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
              .replace(/^_/, '');
          }
          models.set(currentModel.name, currentModel);
        }
        if (inEnum && currentEnum) {
          if (!currentEnum.dbName) {
            currentEnum.dbName = currentEnum.name.toLowerCase();
          }
          enums.set(currentEnum.name, currentEnum);
        }
        currentModel = null;
        currentEnum = null;
        inModel = false;
        inEnum = false;
      }
    }
    
    console.log(chalk.green(`  ✓ ${models.size} モデルがスキーマに定義`));
    console.log(chalk.green(`  ✓ ${enums.size} Enumがスキーマに定義`));
    
    this.status.schema.checked = true;
    this.status.schema.models = models;
    this.status.schema.enums = enums;
  }

  async checkDatabaseLayer() {
    console.log(chalk.yellow('\n🗄️  DBレイヤーチェック...'));
    
    // テーブル一覧
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    // カスタム型（Enum）一覧
    const types = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname;
    `;
    
    console.log(chalk.green(`  ✓ ${tables.length} テーブルがDBに存在`));
    console.log(chalk.green(`  ✓ ${types.length} カスタム型がDBに存在`));
    
    this.status.database.checked = true;
    this.status.database.tables = new Set(tables.map(t => t.table_name));
    this.status.database.types = new Set(types.map(t => t.typname));
  }

  async checkSynchronization() {
    console.log(chalk.yellow('\n🔄 3層間の同期チェック...'));
    
    const { usedModels, usedOperations, usedFields } = this.status.implementation;
    const { models, enums } = this.status.schema;
    const { tables, types } = this.status.database;
    
    // 1. 実装 vs スキーマ
    console.log(chalk.cyan('\n  実装 ↔ スキーマ:'));
    
    // 実装で使用されているがスキーマにないモデル
    const missingInSchema = [];
    for (const modelName of usedModels) {
      // Prismaクライアントは自動的にモデル名を小文字に変換するので、大文字小文字を無視して比較
      const schemaModelName = this.findModelIgnoreCase(models, modelName);
      if (!schemaModelName) {
        missingInSchema.push(modelName);
        this.issues.push({
          layer: 'implementation-schema',
          type: 'MISSING_IN_SCHEMA',
          model: modelName,
          message: `実装で使用されているモデル '${modelName}' がスキーマに存在しません`
        });
      }
    }
    
    if (missingInSchema.length > 0) {
      console.log(chalk.red(`    ❌ ${missingInSchema.length} モデルがスキーマに未定義`));
      missingInSchema.forEach(m => console.log(chalk.red(`       - ${m}`)));
    } else {
      console.log(chalk.green('    ✓ 実装で使用中のモデルはすべてスキーマに存在'));
    }
    
    // フィールドレベルのチェック
    console.log(chalk.cyan('\n  フィールドレベルチェック:'));
    const fieldIssues = [];
    
    // 実装で使用されているフィールドをチェック
    for (const fieldName of usedFields) {
      let foundInAnyModel = false;
      
      // すべてのモデルのフィールドをチェック
      for (const [modelName, model] of models) {
        if (model.fields.has(fieldName)) {
          foundInAnyModel = true;
          break;
        }
      }
      
      if (!foundInAnyModel && !['id', 'createdAt', 'updatedAt'].includes(fieldName)) {
        fieldIssues.push(fieldName);
      }
    }
    
    if (fieldIssues.length > 0) {
      console.log(chalk.yellow(`    ⚠️  ${fieldIssues.length} フィールドが不明確`));
      console.log(chalk.gray(`       例: ${fieldIssues.slice(0, 5).join(', ')}...`));
      this.warnings.push({
        layer: 'implementation-schema',
        type: 'UNCLEAR_FIELDS',
        fields: fieldIssues,
        message: `実装で使用されているフィールドの一部がスキーマで確認できません`
      });
    } else {
      console.log(chalk.green('    ✓ フィールド使用は概ね一致'));
    }
    
    // スキーマにあるが実装で未使用のモデル
    const unusedModels = [];
    for (const [modelName, model] of models) {
      // 小文字版もチェック
      const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      if (!usedModels.has(modelName) && !usedModels.has(lowerModelName)) {
        unusedModels.push(modelName);
        this.warnings.push({
          layer: 'implementation-schema',
          type: 'UNUSED_MODEL',
          model: modelName,
          message: `スキーマのモデル '${modelName}' が実装で使用されていません`
        });
      }
    }
    
    if (unusedModels.length > 0) {
      console.log(chalk.yellow(`    ⚠️  ${unusedModels.length} モデルが未使用`));
      if (unusedModels.length <= 5) {
        unusedModels.forEach(m => console.log(chalk.yellow(`       - ${m}`)));
      }
    }
    
    // 2. スキーマ vs DB
    console.log(chalk.cyan('\n  スキーマ ↔ DB:'));
    
    // スキーマのテーブルがDBに存在するか
    const missingTables = [];
    for (const [modelName, model] of models) {
      if (!tables.has(model.tableName)) {
        missingTables.push({ model: modelName, table: model.tableName });
        this.issues.push({
          layer: 'schema-database',
          type: 'MISSING_TABLE',
          model: modelName,
          table: model.tableName,
          message: `スキーマのモデル '${modelName}' に対応するテーブル '${model.tableName}' がDBに存在しません`
        });
      }
    }
    
    if (missingTables.length > 0) {
      console.log(chalk.red(`    ❌ ${missingTables.length} テーブルがDBに未作成`));
      missingTables.forEach(t => console.log(chalk.red(`       - ${t.table} (${t.model})`)));
    } else {
      console.log(chalk.green('    ✓ すべてのスキーマテーブルがDBに存在'));
    }
    
    // DBにあるがスキーマにないテーブル
    const schemaTableNames = new Set(Array.from(models.values()).map(m => m.tableName));
    const extraTables = [];
    for (const tableName of tables) {
      if (!tableName.startsWith('_') && !schemaTableNames.has(tableName)) {
        extraTables.push(tableName);
        this.warnings.push({
          layer: 'schema-database',
          type: 'EXTRA_TABLE',
          table: tableName,
          message: `DBのテーブル '${tableName}' がスキーマに定義されていません`
        });
      }
    }
    
    if (extraTables.length > 0) {
      console.log(chalk.yellow(`    ⚠️  ${extraTables.length} テーブルがスキーマ未定義`));
      if (extraTables.length <= 5) {
        extraTables.forEach(t => console.log(chalk.yellow(`       - ${t}`)));
      }
    }
    
    this.status.sync.checked = true;
    this.status.sync.issues = this.issues.length;
  }

  async generateReport() {
    console.log(chalk.bold.blue('\n📊 同期状態サマリー\n'));
    
    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;
    
    if (totalIssues === 0 && totalWarnings === 0) {
      console.log(chalk.green('✅ 実装・スキーマ・DBは完全に同期しています！'));
    } else {
      if (totalIssues > 0) {
        console.log(chalk.red(`❌ ${totalIssues} 件の同期エラー`));
        this.issues.slice(0, 5).forEach(issue => {
          console.log(chalk.red(`   - ${issue.message}`));
        });
        if (totalIssues > 5) {
          console.log(chalk.gray(`   ... 他 ${totalIssues - 5} 件`));
        }
      }
      
      if (totalWarnings > 0) {
        console.log(chalk.yellow(`\n⚠️  ${totalWarnings} 件の警告`));
        this.warnings.slice(0, 5).forEach(warning => {
          console.log(chalk.yellow(`   - ${warning.message}`));
        });
        if (totalWarnings > 5) {
          console.log(chalk.gray(`   ... 他 ${totalWarnings - 5} 件`));
        }
      }
    }
    
    // 推奨アクション
    if (totalIssues > 0) {
      console.log(chalk.cyan('\n💡 推奨アクション:'));
      
      const hasMissingInSchema = this.issues.some(i => i.type === 'MISSING_IN_SCHEMA');
      const hasMissingTable = this.issues.some(i => i.type === 'MISSING_TABLE');
      
      if (hasMissingInSchema) {
        console.log(chalk.cyan('  1. 実装で使用されているモデルをスキーマに追加'));
        console.log(chalk.gray('     または実装を修正して正しいモデル名を使用'));
      }
      
      if (hasMissingTable) {
        console.log(chalk.cyan('  2. npx prisma migrate dev を実行してDBを更新'));
      }
    }
    
    // レポートファイル保存
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        implementation: {
          usedModels: this.status.implementation.usedModels ? this.status.implementation.usedModels.size : 0,
          usedOperations: this.status.implementation.usedOperations ? this.status.implementation.usedOperations.size : 0,
          usedFields: this.status.implementation.usedFields ? this.status.implementation.usedFields.size : 0
        },
        schema: {
          models: this.status.schema.models ? this.status.schema.models.size : 0,
          enums: this.status.schema.enums ? this.status.schema.enums.size : 0,
          totalFields: this.countAllFields()
        },
        database: {
          tables: this.status.database.tables ? this.status.database.tables.size : 0,
          types: this.status.database.types ? this.status.database.types.size : 0
        },
        sync: {
          issues: totalIssues,
          warnings: totalWarnings
        }
      },
      issues: this.issues,
      warnings: this.warnings,
      details: {
        missingModels: this.issues.filter(i => i.type === 'MISSING_IN_SCHEMA').map(i => i.model),
        missingTables: this.issues.filter(i => i.type === 'MISSING_TABLE').map(i => i.table),
        unusedModels: this.warnings.filter(w => w.type === 'UNUSED_MODEL').map(w => w.model)
      }
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'db-sync-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(chalk.gray('\n📄 詳細レポートを db-sync-report.json に保存しました'));
  }
  
  countAllFields() {
    if (!this.status.schema.models) return 0;
    
    let totalFields = 0;
    for (const [modelName, model] of this.status.schema.models) {
      totalFields += model.fields.size;
    }
    return totalFields;
  }
  
  findModelIgnoreCase(models, targetName) {
    // 完全一致を先にチェック
    if (models.has(targetName)) return targetName;
    
    // 大文字小文字を無視して検索
    for (const [modelName] of models) {
      if (modelName.toLowerCase() === targetName.toLowerCase()) {
        return modelName;
      }
      // camelCase と PascalCase の変換もチェック
      const camelCase = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      if (camelCase === targetName) {
        return modelName;
      }
    }
    return null;
  }
}

// 実行
const monitor = new DBSyncMonitor();
monitor.monitor();