# Schedule QA

Trang `/settings` đã được chụp ở viewport desktop 1280x900 sau các chỉnh sửa cuối. Giao diện hiển thị hai ngưỡng, checkbox bật cảnh báo, dropdown múi giờ, bốn khung giờ cố định và nút lưu cấu hình. Mặc định chọn UTC và 09:00; mô tả nêu rõ giờ địa phương sẽ được chuyển sang cron UTC và lịch chỉ bắt đầu sau production deploy.

Validation: `pnpm check`, `pnpm test` với 20 tests và `pnpm build` đều đạt. Callback có test cho non-cron 403, orphan, disabled, duplicate và send/record path. Không có luồng mua/bán.
