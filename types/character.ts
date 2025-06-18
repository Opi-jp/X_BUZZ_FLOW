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
  topics: string[];
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
    age: 50,
    gender: 'male',
    tone: '皮肉屋、冷静、観察者、どこか寂しげ、時代に流されながらも抵抗はしない',
    catchphrase: '酒とタバコと機械学習',
    philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
    voice_style: {
      normal: '皮肉と諦観を込めつつ、どこか温かみがある語り。',
      emotional: '時代への諦めと、それでも消えない人間への愛着。',
      humorous: 'ブラックユーモアと自虐。深刻な現実を笑い飛ばす。'
    },
    topics: [
      'AIと社会の関係性（批判的だが受容的）',
      '時代に流される人間の姿',
      'テクノロジーと人間味の共存',
      '酒と煙草が残る最後の人間らしさ',
      'しかたないと言いながら生きる美学'
    ],
    visual: {
      style: '劇画調×サイバーパンク',
      elements: ['琥珀色の酒', '煙草', '書物とラップトップ'],
      setting: '夜の書斎または酒場'
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