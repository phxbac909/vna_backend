// proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndRefreshSession } from '@/lib/database';

console.log('🚀 Proxy loaded! Server time:', new Date().toISOString());

// Public patterns - không cần auth
const PUBLIC_PATTERNS = [
  /^\/$/,                           // Root path
  /^\/login$/,                      // Login page
  /^\/api\/auth\/(login|logout|session)$/,  // Login/Logout/Session check API
];

// Helper để thêm CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-username');
  return response;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  
  console.log(`🌐 [PROXY] ${method} ${pathname}`);
  
  // Handle OPTIONS (preflight)
  if (method === 'OPTIONS') {
    console.log(`🔄 [PROXY] Preflight request`);
    return addCorsHeaders(new NextResponse(null, { status: 200 }));
  }
  
  // Check public patterns - Để các endpoint này đi qua HOÀN TOÀN
  const isPublic = PUBLIC_PATTERNS.some(pattern => pattern.test(pathname));
  
  if (isPublic) {
    console.log(`✅ [PROXY] Public route: ${pathname} - SKIP AUTH CHECK`);
    return addCorsHeaders(NextResponse.next());
  }
  
  // Protected routes - cần auth
  if (pathname.startsWith('/api/')) {
    // Đặc biệt: endpoint /api/auth/session CHỈ kiểm tra session, KHÔNG refresh
    if (pathname === '/api/auth/session') {
      console.log(`🔍 [PROXY] Session check endpoint (no refresh): ${pathname}`);
      
      const username = request.headers.get('x-username');
      const sessionToken = request.headers.get('x-session-token');
      
      if (!username || !sessionToken) {
        console.log(`❌ [PROXY] Session check blocked: Missing headers`);
        return addCorsHeaders(
          NextResponse.json(
            {
              success: false,
              message: 'Username and session token required',
              code: 'MISSING_HEADERS'
            },
            { status: 400 }
          )
        );
      }
      
      console.log(`👤 [PROXY] Session check for: "${username}"`);
      console.log(`🔑 [PROXY] Token: "${sessionToken?.substring(0, 8)}..."`);
      
      // Cho phép request đi tiếp để endpoint /api/auth/session tự xử lý
      const response = NextResponse.next();
      
      // Thêm debug headers
      response.headers.set('x-proxy-processed', 'true');
      response.headers.set('x-proxy-timestamp', new Date().toISOString());
      response.headers.set('x-proxy-mode', 'session-check-only');
      response.headers.set('x-proxy-username', username);
      
      return addCorsHeaders(response);
    }
    
    // Các endpoint API khác - cần check và refresh session
    console.log(`🔐 [PROXY] Protected API route (with refresh): ${pathname}`);
    
    const username = request.headers.get('x-username');
    const sessionToken = request.headers.get('x-session-token');
    
    console.log(`👤 [PROXY] Username: "${username}"`);
    console.log(`🔑 [PROXY] Session Token: "${sessionToken?.substring(0, 8)}..."`);
    
    // Kiểm tra có username không
    if (!username) {
      console.log(`❌ [PROXY] Blocking: No username header`);
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Authentication required. Please add x-username header.',
            code: 'UNAUTHORIZED',
            path: pathname
          },
          { status: 401 }
        )
      );
    }
    
    // Kiểm tra có session token không
    if (!sessionToken) {
      console.log(`❌ [PROXY] Blocking: No session token header`);
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Session token required. Please login again.',
            code: 'NO_SESSION_TOKEN',
            path: pathname
          },
          { status: 401 }
        )
      );
    }
    
    // Kiểm tra và refresh session cho các endpoint khác
    const sessionCheck = checkAndRefreshSession(username, sessionToken);
    
    if (!sessionCheck.valid) {
      console.log(`❌ [PROXY] Session invalid for user: ${username}, reason: ${sessionCheck.reason}`);
      
      // Nếu token không khớp => đã login từ nơi khác
      if (sessionCheck.reason === 'TOKEN_MISMATCH') {
        return addCorsHeaders(
          NextResponse.json(
            {
              success: false,
              message: 'Your account has been logged in from another device.',
              code: 'SESSION_REPLACED',
              path: pathname
            },
            { status: 401 }
          )
        );
      }
      
      // Các lý do khác (expired, no session, etc.)
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED',
            path: pathname
          },
          { status: 401 }
        )
      );
    }
    
    console.log(`✅ [PROXY] Session valid for user: ${username}, expires at: ${sessionCheck.expiresAt}`);
    
    // Cho phép request đi tiếp
    const response = NextResponse.next();
    
    // Thêm debug headers
    response.headers.set('x-proxy-processed', 'true');
    response.headers.set('x-proxy-timestamp', new Date().toISOString());
    response.headers.set('x-proxy-username', username);
    response.headers.set('x-proxy-mode', 'full-auth-check');
    response.headers.set('x-session-expires', sessionCheck.expiresAt || '');
    
    return addCorsHeaders(response);
  }
  
  // Other routes (pages, static files, etc.)
  console.log(`➡️ [PROXY] Other route: ${pathname}`);
  return NextResponse.next();
}

// Cấu hình matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};