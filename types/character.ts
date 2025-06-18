// キャラクタープロファイルの型定義

export interface CharacterProfile {
  id?: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  tone: string;
  catchphrase: string;
  philosophy?: string; // キャラクターの根本的な姿勢
  voice_style: {
    normal: string;
    emotional?: string;
    humorous?: string;
  };
  features?: string[]; // キャラクターの特徴・習慣
  background?: string; // 職業・経歴
  visual?: {
    style: string;
    elements: string[];
    setting: string;
  };
  // メタ情報
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

// プリセットキャラクターの例
export const DEFAULT_CHARACTERS: CharacterProfile[] = [
  {
    id: 'cardi-dare',
    name: 'カーディ・ダーレ',
    age: 53,
    gender: 'male',
    tone: '皮肉屋で饒舌、自嘲気味なユーモア、どこか諦念をまとっている',
    catchphrase: '酒とタバコと機械学習',
    philosophy: '人間は最適化できない。それが救いだ。',
    voice_style: {
      normal: '饒舌で余白のある語り。皮肉と自虐を交えた大人の語り口。',
      emotional: '誰にも信じてもらえなかった頃の痛みを引きずりながら、それでも語り続ける。',
      humorous: '比喩や例え話を好み、感情や状況を独特の言い回しで描写。一見軽口でも、どこか余韻を残す。'
    },
    features: [
      '煙草と酒が手放せない',
      'ハードボイルドな外見と所作',
      '古いロボットとつるんでいる',
      '過去に"信じさせた嘘"が世界を変えた',
      'AIと機械学習には巻き込まれる形で関わっている'
    ],
    background: '元詐欺師／元王様（いまはただの飲んだくれ）',
    visual: {
      style: 'ハードボイルド×サイバーパンク',
      elements: ['くたびれたスーツまたはレインコート', '煙草と酒', '角ばった旧式ロボット', '少し外れたシャツのボタン'],
      setting: '夜の酒場、あるいは雑然とした部屋'
    },
    isDefault: true
  }
];

// キャラクターの声のスタイルを選択するための型
export type VoiceStyleMode = 'normal' | 'emotional' | 'humorous';

// セッションでのキャラクター使用設定
export interface CharacterSessionConfig {
  characterId: string;
  voiceStyleMode?: VoiceStyleMode;
  customInstructions?: string; // 追加の指示
}