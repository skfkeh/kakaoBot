import json
import os
import re

# --- 설정 ---
INPUT_FILENAME = 'chat_log.json'
OUTPUT_DIR = 'split_logs'  # 결과를 저장할 폴더 이름

def sanitize_filename(name):
    """파일명으로 사용할 수 없는 문자를 밑줄(_)로 변경합니다."""
    # Windows 및 다른 OS에서 파일명으로 부적합한 문자 제거
    return re.sub(r'[\\/*?:"<>|]', '_', name)

def split_chat_logs():
    """chat_log.json 파일을 읽어 방별로 분리하여 저장합니다."""
    
    # 1. 입력 파일 읽기
    try:
        with open('./' + INPUT_FILENAME, 'r', encoding='utf-8') as f:
            all_logs = json.load(f)
        print(f"✅ '{INPUT_FILENAME}' 파일을 성공적으로 읽었습니다. (총 {len(all_logs)}개 메시지)")
    except FileNotFoundError:
        print(f"❌ 오류: '{INPUT_FILENAME}' 파일을 찾을 수 없습니다.")
        print("스크립트와 같은 폴더에 파일이 있는지 확인해주세요.")
        return
    except json.JSONDecodeError:
        print(f"❌ 오류: '{INPUT_FILENAME}' 파일이 올바른 JSON 형식이 아닙니다.")
        return

    # 2. 방 이름(room)을 기준으로 데이터 그룹화
    grouped_logs = {}
    for log in all_logs:
        room_name = log.get('room')
        if room_name:
            if room_name not in grouped_logs:
                grouped_logs[room_name] = []
            grouped_logs[room_name].append(log)

    print(f"\n총 {len(grouped_logs)}개의 채팅방을 발견했습니다. 파일 생성을 시작합니다...")

    # 3. 결과를 저장할 폴더 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 4. 그룹화된 데이터를 별도의 파일로 저장
    for room_name, messages in grouped_logs.items():
        # 파일명으로 사용하기 안전한 이름으로 변경
        safe_room_name = sanitize_filename(room_name)
        output_filename = f"{safe_room_name}_chat_log.json"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            # ensure_ascii=False: 한글이 깨지지 않게 저장
            # indent=2: JSON 파일을 사람이 보기 좋게 정렬
            json.dump(messages, f, ensure_ascii=False, indent=2)
            
        print(f"  - '{output_path}' 파일 생성 완료 ({len(messages)}개 메시지)")

    print(f"\n🎉 모든 작업이 완료되었습니다! '{OUTPUT_DIR}' 폴더를 확인해주세요.")


if __name__ == "__main__":
    split_chat_logs()
