import subprocess
import sys
import os
import signal
import time

# 프로젝트 루트 경로
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def main():
    print("=" * 50)
    print("  Music Streaming App 실행기 (HTTPS)")
    print("=" * 50)
    print()

    processes = []

    try:
        # 1) 백엔드 서버 실행 (HTTPS: 5001, HTTP: 5000)
        print("[1/2] 백엔드 서버 시작 중... (https://localhost:5001)")
        backend = subprocess.Popen(
            ["dotnet", "run"],
            cwd=BACKEND_DIR,
            shell=True,
        )
        processes.append(backend)

        # 백엔드가 먼저 뜰 시간을 줌
        time.sleep(3)

        # 2) 프론트엔드 서버 실행 (HTTPS)
        print("[2/2] 프론트엔드 서버 시작 중... (https://localhost:3000)")
        frontend = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=FRONTEND_DIR,
            shell=True,
        )
        processes.append(frontend)

        print()
        print("=" * 50)
        print("  두 서버가 모두 실행되었습니다! (HTTPS)")
        print("  - 백엔드:    https://localhost:5001")
        print("  - 프론트엔드: https://localhost:3000")
        print()
        print("  브라우저에서 https://localhost:3000 접속하세요.")
        print("  종료하려면 Ctrl+C 를 누르세요.")
        print("=" * 50)

        # 프로세스가 종료될 때까지 대기
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print("\n서버를 종료합니다...")
        for p in processes:
            p.terminate()
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        print("종료 완료.")

if __name__ == "__main__":
    main()
