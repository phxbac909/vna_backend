export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          🚀 Authentication API Server
        </h1>
        <p className="text-gray-600 mb-6">
          Server đang chạy. Sử dụng các API endpoints sau:
        </p>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg">POST /api/auth/login</h3>
            <p className="text-sm text-gray-600">Đăng nhập</p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-lg">POST /api/auth/register</h3>
            <p className="text-sm text-gray-600">Đăng ký tài khoản mới</p>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-lg">GET /api/users</h3>
            <p className="text-sm text-gray-600">Lấy danh sách users</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-sm text-gray-700">
            📝 <strong>Lưu ý:</strong> Frontend được triển khai riêng. 
            Đây chỉ là API server.
          </p>
        </div>
      </div>
    </div>
  );
}