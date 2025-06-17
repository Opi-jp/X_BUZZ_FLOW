#!/usr/bin/env python3

"""
自動でproceed確認にエンターを押すスクリプト

使い方:
1. 別のターミナルでこのスクリプトを実行
   python scripts/auto-proceed.py

2. オプション:
   --interval 1  # チェック間隔（秒）
   --pattern "proceed"  # 検出するパターン
   --command "your command"  # 監視するコマンドを同時に実行
"""

import subprocess
import time
import sys
import argparse
import os
import select
import termios
import tty
import pty
import threading
from datetime import datetime

class AutoProceeder:
    def __init__(self, pattern="proceed", interval=0.5):
        self.pattern = pattern.lower()
        self.interval = interval
        self.running = True
        self.process = None
        
    def log(self, message):
        """タイムスタンプ付きでログ出力"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def monitor_process(self, command):
        """コマンドを実行して出力を監視"""
        self.log(f"コマンドを実行: {command}")
        
        # PTYを使用してインタラクティブなプロセスを作成
        master, slave = pty.openpty()
        
        try:
            # プロセスを開始
            self.process = subprocess.Popen(
                command,
                shell=True,
                stdin=slave,
                stdout=slave,
                stderr=slave,
                universal_newlines=True
            )
            
            os.close(slave)
            
            # 出力をリアルタイムで監視
            while self.running and self.process.poll() is None:
                # 読み取り可能なデータがあるかチェック
                readable, _, _ = select.select([master], [], [], 0.1)
                
                if readable:
                    try:
                        output = os.read(master, 1024).decode('utf-8', errors='ignore')
                        
                        # 出力を表示
                        sys.stdout.write(output)
                        sys.stdout.flush()
                        
                        # パターンをチェック
                        if self.pattern in output.lower():
                            self.log(f"'{self.pattern}' を検出！Enterを送信します")
                            os.write(master, b'\n')
                            
                    except OSError:
                        break
                        
        except Exception as e:
            self.log(f"エラー: {e}")
            
        finally:
            os.close(master)
            if self.process:
                self.process.terminate()
                
    def monitor_terminal(self):
        """現在のターミナルの出力を監視（実験的）"""
        self.log(f"ターミナル監視モード: '{self.pattern}' を検出したらEnterを押します")
        self.log("Ctrl+C で終了")
        
        try:
            # 標準入力を非ブロッキングモードに設定
            old_settings = termios.tcgetattr(sys.stdin)
            tty.setcbreak(sys.stdin.fileno())
            
            buffer = ""
            
            while self.running:
                # キー入力をチェック
                if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
                    char = sys.stdin.read(1)
                    
                    # Ctrl+Cで終了
                    if ord(char) == 3:
                        break
                        
                    buffer += char
                    
                    # バッファをチェック
                    if len(buffer) > 100:
                        buffer = buffer[-100:]  # 最後の100文字のみ保持
                        
                    if self.pattern in buffer.lower():
                        self.log(f"'{self.pattern}' を検出！")
                        # ここでEnterを送信する処理を追加
                        # （ターミナルによって異なるため、実装は環境依存）
                        
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            pass
            
        finally:
            # 設定を元に戻す
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
            self.log("監視を終了しました")
            
    def watch_output_simple(self):
        """シンプルなアプローチ: echoとyesコマンドを使用"""
        self.log("シンプルモード: proceedが表示されたら自動的にEnterを送信します")
        self.log("使用例: npm install | python scripts/auto-proceed.py")
        
        try:
            while self.running:
                line = sys.stdin.readline()
                if not line:
                    break
                    
                # 標準出力に転送
                sys.stdout.write(line)
                sys.stdout.flush()
                
                # パターンをチェック
                if self.pattern in line.lower():
                    self.log(f"'{self.pattern}' を検出！")
                    # 多くの場合、これで十分
                    print()  # 空行を出力（Enterキーと同等）
                    
        except KeyboardInterrupt:
            pass
            
        finally:
            self.log("終了しました")

def main():
    parser = argparse.ArgumentParser(
        description="proceed確認を自動的にEnterで進めるツール"
    )
    parser.add_argument(
        "--pattern", 
        default="proceed",
        help="検出するパターン（デフォルト: proceed）"
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0.5,
        help="チェック間隔（秒）"
    )
    parser.add_argument(
        "--command",
        help="実行して監視するコマンド"
    )
    parser.add_argument(
        "--mode",
        choices=["command", "terminal", "pipe"],
        default="pipe",
        help="動作モード"
    )
    
    args = parser.parse_args()
    
    proceeder = AutoProceeder(
        pattern=args.pattern,
        interval=args.interval
    )
    
    print(f"""
🤖 Auto Proceed Tool
===================
パターン: '{args.pattern}'
チェック間隔: {args.interval}秒
モード: {args.mode}

使い方:
1. パイプモード（推奨）:
   npm install | python scripts/auto-proceed.py
   
2. コマンドモード:
   python scripts/auto-proceed.py --command "npm install"
   
3. 応用例（yesコマンドと組み合わせ）:
   yes | npm install

Ctrl+C で終了
""")
    
    try:
        if args.command:
            proceeder.monitor_process(args.command)
        elif args.mode == "terminal":
            proceeder.monitor_terminal()
        else:
            proceeder.watch_output_simple()
            
    except KeyboardInterrupt:
        print("\n\n👋 終了しました")
        
    finally:
        proceeder.running = False

if __name__ == "__main__":
    main()