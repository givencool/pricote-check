# pricote - Client-side C++ Coding Test Judge & Viewer

> **⚠️ 중요 안내 (Disclaimer)**
> 1. **이 앱은 어떠한 문제 데이터도 포함하거나 저장하지 않으며, 사용자가 직접 준비한 `.md` 파일을 로컬에서 불러와 사용하는 도구입니다.**
> 2. **채점을 위해서는 별도로 Piston(또는 Judge0) 채점 서버를 직접 구축(예: Oracle Cloud Always Free)하고, 앱 설정 화면(⚙️)에 서버 주소와 토큰을 입력해야 합니다. 서버 구축 방법은 아래 [채점 서버 구축 가이드](#️-oracle-cloud-채점-서버-구축-가이드-실제-검증된-절차)를 참고하세요.**
> 3. **서버 URL과 인증 토큰은 소스코드나 레포지토리에 절대 포함되지 않으며, 사용자 본인 브라우저의 `localStorage`에만 안전하게 보관됩니다.**

---

## 🌟 프로젝트 소개

pricote는 서버 및 데이터베이스 비용 없이($0), 정적 웹 호스팅(GitHub Pages)을 통해 브라우저에서 실행되는 **C++ 알고리즘 코딩테스트 풀이 및 자체 채점 도구**입니다.

Oracle Cloud Always Free 인스턴스에 구축한 본인만의 **Piston** 채점 서버와 연동하여 C++ 코드를 실시간으로 컴파일 및 채점하며, 문제 파일 및 채점 결과는 사용자의 로컬 컴퓨터에서만 읽고 저장됩니다.

### 핵심 특징
- 🚫 **0원 정적 프론트엔드**: GitHub Pages로 호스팅되며, 프론트엔드 유지비용 $0
- 🔒 **완전한 프라이버시 & 보안**: 문제 데이터는 `FileReader`로 메모리 상에서만 처리되며, 채점 서버 자격증명(URL, 토큰)은 브라우저 `localStorage`에만 저장 (Public Repo 공개 시에도 서버 주소·토큰 노출 없음)
- ⚡ **자체 호스팅 채점 엔진 연동**: **Piston**(검증 완료) 및 **Judge0 CE**(대안) 지원, 커스텀 인증 헤더(`X-Grading-Token`, `X-Auth-Token` 등) 지원
- 💻 **Monaco Editor 탑재**: VS Code 기반 Monaco Editor (C++ 문법 강조, 빠른 입출력 보일러플레이트, 테마 전환, `Ctrl/Cmd + Enter` 단축키)
- 📱 **반응형 웹 UI**: 데스크탑(Mac/Windows), 아이패드(Safari 가로/세로 모드), 모바일 환경 대응
- 💾 **마크다운 결과 내보내기**: 문제 메타데이터, 제출 코드, 채점 결과(통과 여부, 실행 시간)를 `result_{문제id}_{yyyymmdd_hhmm}.md` 파일로 브라우저에서 즉시 다운로드
- 📂 **다중 문제 일괄 로드**: 여러 개의 `.md` 파일을 한 번에 선택하여 문제 목록 드롭다운으로 빠르게 전환 가능

---

## 📋 문제 마크다운(.md) 파일 포맷 가이드

로컬에서 불러올 문제 파일은 **YAML Frontmatter**와 **마크다운 본문**으로 구성됩니다.

```markdown
---
id: 1000
title: "A+B"
time_limit: "1초"
memory_limit: "256MB"
difficulty: "Bronze V"
tags: ["구현", "사칙연산", "수학"]
examples:
  - input: "1 2"
    output: "3"
  - input: "3 4"
    output: "7"
---
## 문제
두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.

## 입력
첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)

## 출력
첫째 줄에 A+B를 출력한다.
```

### Frontmatter 필드 설명
| 필드명 | 필수 여부 | 설명 | 예시 |
| :--- | :---: | :--- | :--- |
| `id` | 선택 | 문제 식별 번호 또는 문자열 | `1000`, `"boj-1000"` |
| `title` | 필수 | 문제 제목 | `"A+B"` |
| `time_limit` | 선택 | 시간 제한 (기본값: 1초/2초) | `"1초"` |
| `memory_limit`| 선택 | 메모리 제한 (기본값: 256MB) | `"256MB"` |
| `difficulty` | 선택 | 난이도 (Bronze, Silver, Gold, Platinum, Diamond, Ruby) | `"Bronze V"`, `"Gold III"` |
| `tags` | 선택 | 알고리즘 분류 태그 목록 | `["구현", "그리디"]` |
| `examples` | 필수 | 예제 입력(`input`)과 기대 출력(`output`)의 배열 | `[{input: "1 2", output: "3"}]` |

> 💡 웹앱 상단의 **[📝]** 버튼을 누르면 위 템플릿 파일을 바로 다운로드할 수 있습니다.

---

## 🛠️ Oracle Cloud 채점 서버 구축 가이드 (실제 검증된 절차)

Oracle Cloud Always Free 인스턴스(AMD `VM.Standard.E2.1.Micro`, 1 OCPU / 1GB RAM)에서
Piston을 실제로 설치·검증한 전 과정입니다. 온라인에 흔히 도는 가이드와 다르게
막혔던 지점을 그대로 반영했습니다.

> [!IMPORTANT]
> GitHub Pages는 **HTTPS**로 서빙되므로, 브라우저의 Mixed Content 차단을 방지하기 위해 채점 서버에도 **HTTPS**가 적용되어야 합니다. 무료 역방향 프록시 도구인 **Caddy**를 사용하면 Let's Encrypt 인증서가 자동으로 발급됩니다.

### 1. 인스턴스 준비

- Oracle Cloud 가입 (신용카드 등록은 본인 확인용, "Upgrade your account"를 직접 누르지 않는 한 과금 없음)
- Compute > Instances > Create Instance
  - Image: Ubuntu 24.04
  - Shape: `VM.Standard.E2.1.Micro` (Always Free 표시 확인)
  - SSH 키 쌍 생성 후 개인키(`.key`) 안전하게 보관
- Networking > Virtual Cloud Networks > 해당 VCN > Security Lists >
  Default Security List에서 **Ingress Rule에 80, 443 포트를 TCP / `0.0.0.0/0`으로 추가**
  (동명의 VCN이 여러 개 있을 수 있으니, 인스턴스가 실제로 쓰는 VCN이 맞는지 확인)

### 2. Docker 설치

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
exit   # 재접속해야 권한 적용됨
```

재접속 후 `groups`에 `docker`가 포함돼 있는지 확인.

### 3. Piston 컨테이너 구동

```bash
mkdir -p ~/piston && cd ~/piston
nano docker-compose.yml
```

```yaml
version: '3'
services:
  api:
    image: ghcr.io/engineer-man/piston
    container_name: piston_api
    restart: always
    privileged: true
    ports:
      - "2000:2000"
    volumes:
      - ./piston_packages:/piston/packages
    tmpfs:
      - /piston/jobs:exec
```

> ⚠️ **`/piston` 볼륨을 마운트하지 않으면 `chown: cannot access '/piston'` 에러로 컨테이너가
> 재시작 루프에 빠집니다.** 위처럼 `volumes` 항목을 반드시 포함하세요.

```bash
docker-compose up -d
docker ps          # STATUS가 "Up" 인지 확인 (Restarting이면 위 volumes 설정 재확인)
docker logs piston_api   # "API server started on 0.0.0.0:2000" 확인
```

### 4. C++(gcc) 런타임 설치

> ⚠️ **Piston CLI는 컨테이너 안에 들어있지 않습니다.** `docker exec piston_api cli ...`
> 방식은 최신 이미지에서 동작하지 않습니다 (`cli: command not found`). CLI 저장소를
> 별도로 클론해서 실행해야 합니다.

```bash
sudo apt install -y nodejs npm git

cd ~
git clone https://github.com/engineer-man/piston piston-cli-tool
cd piston-cli-tool/cli
npm install

node index.js -u http://localhost:2000 ppman install gcc
node index.js -u http://localhost:2000 ppman list
curl http://localhost:2000/api/v2/runtimes
```

`"language":"c++"` 항목이 보이면 성공. (1GB RAM 서버라 설치에 몇 분 걸릴 수 있음. 화면이
멈춘 것처럼 보여도 `ps aux | grep node`로 프로세스가 살아있으면 기다리면 됨)

> 💡 1GB RAM은 빠듯할 수 있으니 스왑을 추가해두는 것을 권장합니다:
> ```bash
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

### 5. 무료 도메인 연결 (DuckDNS)

1. [duckdns.org](https://www.duckdns.org)에서 로그인 후 서브도메인 발급 (예: `yourname.duckdns.org`)
2. IP 입력란은 기본적으로 **지금 접속한 기기의 IP가 자동 감지되어 채워지므로**,
   이 값을 지우고 **Oracle 인스턴스의 Public IP로 직접 교체**한 뒤 저장

### 6. 서버 내부 방화벽 확인 (Oracle 콘솔 규칙만으로는 부족할 수 있음)

Oracle 콘솔에서 80/443을 열어도 서버 안에서 한 번 더 막혀 있을 수 있습니다.

```bash
sudo ufw status
```

`command not found`가 뜨면 ufw는 애초에 안 깔려있는 것이니 다음으로:

```bash
sudo iptables -L INPUT -n --line-numbers
```

22번(SSH) 외 포트가 막혀있다면:

```bash
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

(`netfilter-persistent`가 없으면 `sudo apt install -y iptables-persistent` 먼저 설치)

간단 테스트:

```bash
sudo python3 -m http.server 80
```

맥 브라우저에서 `http://<Oracle Public IP>` 접속 시 `Directory listing for /`가 뜨면
포트가 완전히 열린 것. 확인 후 `Ctrl+C`로 종료.

### 7. Caddy로 HTTPS + 토큰 인증 설정

```bash
sudo apt install -y caddy
openssl rand -hex 24     # 접근 토큰 생성, 결과값 보관해둘 것
sudo nano /etc/caddy/Caddyfile
```

```caddy
yourname.duckdns.org {
    @denied not header X-Grading-Token "발급받은_토큰_값"
    respond @denied "Unauthorized" 401

    reverse_proxy localhost:2000
}
```

```bash
sudo systemctl restart caddy
sudo systemctl status caddy   # active (running) 확인
```

### 8. 최종 검증

```bash
curl -H "X-Grading-Token: 발급받은_토큰_값" https://yourname.duckdns.org/api/v2/runtimes
# → c, c++(cpp/g++ 별칭 포함) 등 언어 목록 JSON 반환되어야 함

curl https://yourname.duckdns.org/api/v2/runtimes
# → 토큰 없이는 "Unauthorized" 반환되어야 함 (보안 정상 작동)
```

두 결과 모두 정상이면 채점 서버 구축이 완료된 것입니다.

---

### (대안) Judge0 CE로 구축하려는 경우

```bash
mkdir -p ~/judge0 && cd ~/judge0
wget https://github.com/judge0/judge0/releases/download/v1.13.1/judge0-v1.13.1.zip
unzip judge0-v1.13.1.zip
# judge0.conf 파일에서 AUTH_TOKEN=<본인의_비밀_토큰> 지정
docker-compose up -d
```

Caddyfile은 Judge0의 기본 인증 헤더인 `X-Auth-Token`을 그대로 통과시키고
`reverse_proxy localhost:2358`로 연결하면 됩니다. 앱 설정 화면에서 엔진을
Judge0 CE로 선택하고 헤더명을 `X-Auth-Token`으로 지정하세요.

---

## 🚀 웹앱 사용 방법

1. **채점 서버 설정 (최초 1회)**:
   - 상단 우측의 **[⚙️]** 버튼 또는 **[서버 미설정]** 배지를 클릭합니다.
   - 채점 엔진 종류를 **Piston**으로 선택합니다.
   - 서버의 HTTPS URL(예: `https://yourname.duckdns.org`)과 접근 토큰을 입력합니다.
   - **[📡 연결 테스트 (Ping)]**를 눌러 통신이 정상인지 확인 후 **[저장하기]**를 클릭합니다.
2. **문제 파일 로드**:
   - 상단 **[📂 문제 불러오기]** 버튼을 클릭하거나 화면 중앙으로 `.md` 파일(여러 개 가능)을 드래그 앤 드롭합니다.
   - **[⚡ 예제 로드]**를 클릭해 내장된 A+B 예시 문제를 열 수도 있습니다.
3. **C++ 풀이 작성 및 채점**:
   - 우측 Monaco Editor에 솔루션을 작성합니다.
   - **[▶ 채점 실행]** 버튼 또는 `Ctrl + Enter` (Mac: `Cmd + Enter`)를 누릅니다.
   - 각 테스트케이스별 실행 시간, 기댓값 대비 실제 출력 diff, 통과 여부가 실시간으로 시각화됩니다.
   - `[임의 입력 테스트]` 탭에서 임의의 입력값을 넣고 즉시 실행해볼 수도 있습니다.
4. **결과 내보내기**:
   - 풀이가 완료된 후 **[💾 결과 내보내기]** 버튼을 누르면 풀이 코드와 채점 리포트가 담긴 `result_{문제id}_{yyyymmdd_hhmm}.md` 파일이 브라우저에서 다운로드됩니다.

---

## 🌐 GitHub Pages 배포 방법

이 프로젝트는 정적 파일(HTML/CSS/JS)로만 구성되어 있어 GitHub Pages로 1분 안에 배포할 수 있습니다.

1. 이 저장소를 본인의 GitHub 계정으로 푸시(Push)합니다.
2. 저장소의 **Settings** 탭으로 이동합니다.
3. 좌측 메뉴에서 **Pages**를 선택합니다.
4. **Build and deployment** 항목의 **Source**를 `GitHub Actions`로 설정합니다.
   - 레포지토리에 포함된 `.github/workflows/deploy.yml` 워크플로우에 의해 자동으로 배포가 완료됩니다.
5. 배포된 URL (`https://<username>.github.io/pricote/`)로 접속하여 사용합니다.

---

## 📂 프로젝트 구조

```
pricote/
├── index.html                 # 메인 웹앱 진입점 (설정 모달, 2분할 워크스페이스, 반응형 탭)
├── css/
│   └── main.css              # 다크/라이트 테마, 모달, 뱃지, 반응형 레이아웃
├── js/
│   ├── app.js                # 앱 오케스트레이션, 설정/이벤트/상태 관리
│   ├── judge-client.js       # Judge0 CE & Piston 통합 채점 클라이언트 (localStorage 자격증명)
│   ├── parser.js             # YAML Frontmatter 및 Markdown 파서 (메모리 전용)
│   ├── editor.js             # Monaco Editor C++ 래퍼 및 단축키 바인딩
│   └── exporter.js           # 마크다운 리포트 생성 및 Blob 다운로더
├── sample_template/
│   └── example_problem.md    # 문제 작성용 마크다운 예시 파일
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages 정적 배포 워크플로우
├── .gitignore                 # 로컬 문제 파일 및 로컬 설정 파일 제외
└── README.md                  # 프로젝트 안내서, 가이드, 면책 조항
```

---

## ⚖️ 라이선스

본 프로젝트는 [MIT License](LICENSE) 하에 자유롭게 사용 및 수정이 가능합니다.
풀이하는 개별 문제의 저작권은 각 문제 출제자에게 있으며, 사용자가 로컬 기기에서 불러오는 문제 데이터에 대한 책임은 사용자 본인에게 있습니다.
