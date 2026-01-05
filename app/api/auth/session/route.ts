// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkSessionOnly, findUserByUsername } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const sessionToken = request.headers.get('x-session-token');

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username là bắt buộc',
          code: 'MISSING_USERNAME',
          valid: false
        },
        { status: 400 }
      );
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Session token là bắt buộc',
          code: 'MISSING_TOKEN',
          valid: false
        },
        { status: 400 }
      );
    }

    // Kiểm tra user có tồn tại không
    const user = findUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User không tồn tại',
          code: 'USER_NOT_FOUND',
          valid: false
        },
        { status: 404 }
      );
    }

    // Kiểm tra session có hợp lệ không (KHÔNG refresh)
    const isValid = checkSessionOnly(username, sessionToken);

    if (!isValid) {
      // Kiểm tra lý do: token mismatch hay session expired
      if (user.sessionToken && user.sessionToken !== sessionToken) {
        console.log(`❌ [SESSION CHECK] Token mismatch for ${username}`);
        return NextResponse.json(
          {
            success: false,
            message: 'Session has been replaced by another login',
            code: 'SESSION_REPLACED',
            valid: false
          },
          { status: 401 }
        );
      }

      console.log(`⏰ [SESSION CHECK] Session expired for ${username}`);
      return NextResponse.json(
        {
          success: false,
          message: 'Session expired',
          code: 'SESSION_EXPIRED',
          valid: false
        },
        { status: 401 }
      );
    }

    // Session còn hiệu lực
    console.log(`✅ [SESSION CHECK] Session valid for ${username}`);
    
    return NextResponse.json(
      {
        success: true,
        message: 'Session is valid',
        code: 'SESSION_VALID',
        valid: true,
        data: {
          username: user.username,
          expiresAt: user.expiresAt
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server',
        code: 'SERVER_ERROR',
        valid: false
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-username, x-session-token',
    },
  });
}