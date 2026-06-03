// 解碼 JWT payload(base64url),取 hook 注入的身分 claims
export interface AppClaims {
  acct?: string;    // account_id = 工號|姓名,訂單擁有鍵
  emp_id?: string;  // 工號(顯示用)
  name?: string;    // 中文姓名(顯示用)
  is_admin?: boolean;
}

export function decodeClaims(accessToken: string): AppClaims {
  try {
    const payload = accessToken.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AppClaims;
  } catch {
    return {};
  }
}
