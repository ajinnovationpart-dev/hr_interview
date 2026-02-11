const PROD_DEFAULT_FRONTEND_URL = 'https://ajinnovationpart-dev.github.io/hr_interview';
const DEV_DEFAULT_FRONTEND_URL = 'http://localhost:5173';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getFrontendBaseUrl(): string {
  const configuredRaw = (process.env.FRONTEND_URL || '').trim();
  if (configuredRaw) {
    // CORS 설정 용도로 쉼표 구분값을 넣는 경우 첫 번째 URL을 대표 URL로 사용
    const first = configuredRaw.split(',').map((v) => v.trim()).find(Boolean);
    if (first) return trimTrailingSlash(first);
  }

  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? DEV_DEFAULT_FRONTEND_URL : PROD_DEFAULT_FRONTEND_URL;
}

export function buildFrontendUrl(path: string): string {
  const base = getFrontendBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function buildInterviewerLoginLink(confirmPath: string): string {
  const safeConfirmPath = confirmPath.startsWith('/') ? confirmPath : `/${confirmPath}`;
  return buildFrontendUrl(`/interviewer/login?redirect=${encodeURIComponent(safeConfirmPath)}`);
}
