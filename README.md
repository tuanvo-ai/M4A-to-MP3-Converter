# M4A to MP3 Converter 🎵

Ứng dụng chuyển đổi định dạng âm thanh từ **M4A sang MP3** trực tiếp và hoàn toàn cục bộ (local) bên trong trình duyệt của bạn bằng công nghệ **FFmpeg WebAssembly (FFmpeg.wasm)**. Đảm bảo tốc độ cao, tuyệt đối an toàn và bảo mật dữ liệu vì không có bất kỳ file nào được tải lên máy chủ.

***

## ✨ Tính năng nổi bật

- **Chuyển đổi hoàn toàn cục bộ (Client-Side Only):** Quá trình chuyển đổi diễn ra 100% trên thiết bị của bạn. Không lo rò rỉ dữ liệu, hoạt động cực kỳ riêng tư.
- **Tự động lưu thư mục cũ (In-place Auto-save):** Sử dụng *File System Access API* hiện đại để tự động quét toàn bộ file `.m4a` trong thư mục được chọn và tự động lưu các file `.mp3` thành phẩm trực tiếp vào đúng thư mục ban đầu mà không cần bạn phải tải xuống từng phần thủ công.
- **Tiến trình tuần tự (Sequential Loading):** Quá trình convert được xử lý tuần tự từng file một giúp hệ thống hoạt động ổn định nhất, không gây tràn bộ nhớ hay lag trình duyệt.
- **Đạt hiệu năng tối đa với ESM & Web Worker:** Sử dụng phiên bản ES Module của `@ffmpeg/core` kết hợp Worker đa luồng để tận dụng tối đa sức mạnh phần cứng của CPU.
- **Giao diện hiện đại & Thân thiện:** Thiết kế dựa trên tông màu Slate sang trọng, hiển thị chi tiết phần trăm tiến trình chuyển đổi của từng file và thanh tiến trình tổng quan.
- **Tích hợp cảnh báo Iframe thông minh:** Phát hiện nếu ứng dụng đang chạy trong khung iFrame (như cửa sổ preview của AI Studio) để hướng dẫn người dùng mở ra tab mới, đảm bảo trình duyệt cấp quyền lưu file thành công.

***

## 🚀 Hướng dẫn cài đặt và chạy tại máy cục bộ (Local)

Để chạy ứng dụng trên máy của bạn, hãy làm theo các bước dưới đây:

### 1. Yêu cầu hệ thống
- Đã cài đặt **Node.js** (Phiên bản v18 trở lên được khuyến nghị)
- Trình duyệt hiện đại hỗ trợ tốt File System Access API và SharedArrayBuffer (ví dụ: Google Chrome, Microsoft Edge, Brave, v.v.)

### 2. Cài đặt các gói phụ thuộc
Mở terminal tại thư mục dự án và chạy lệnh sau để cài đặt các thư viện cần thiết:
```bash
npm install
```

### 3. Chạy môi trường phát triển (Development)
Chạy lệnh khởi động máy chủ thử nghiệm:
```bash
npm run dev
```
Sau đó truy cập vào link local (thường là `http://localhost:3000`) hiển thị trên command prompt.

### 4. Xây dựng phiên bản Production
Để đóng gói ứng dụng tối ưu nhất:
```bash
npm run build
```
Sản phẩm đầu ra sẽ nằm gọn trong thư mục `/dist` sẵn sàng để deploy lên GitHub Pages, Vercel, Netlify hoặc Docker Cloud Run.

***

## 🛠️ Công nghệ sử dụng

- **Framework:** React 18, Vite
- **Styling:** Tailwind CSS (utility-first classes)
- **Động cơ cốt lõi:** `@ffmpeg/ffmpeg` kết hợp `@ffmpeg/util` (Phiên bản `@ffmpeg/core@0.12.10`)
- **Icons:** `lucide-react`

***

## 🔒 Tính năng bảo mật (Security Headers)

Do cơ chế bảo mật của trình duyệt khi chạy các tệp WebAssembly đa luồng, máy chủ web cần cấu hình các HTTP headers cụ thể. Trong file `vite.config.ts`, ứng dụng đã được thiết lập sẵn:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Nếu bạn deploy ứng dụng này lên các dịch vụ hosting tĩnh khác (như Vercel hoặc Netlify), vui lòng đảm bảo bạn cấu hình file định cấu hình headers tương ứng (ví dụ `netlify.toml` hoặc `vercel.json`) để cho phép `SharedArrayBuffer` hoạt động.
