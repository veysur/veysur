// Shared with package/api (server-rendered email wrapper, see
// model/common/emailLayout.ts) and package/app (email template editor
// preview, see appAdmin/component/ContentEditor) so the two stay in sync.
export const EMAIL_LAYOUT_STYLE = `
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
h1{color:#2c3e50;font-size:24px;margin-bottom:20px}
h1.h1-success{color:#27ae60}
.btn{display:inline-block;padding:12px 24px;background-color:#3498db;color:#ffffff;text-decoration:none;border-radius:4px;margin:20px 0}
.btn-warning{background-color:#e67e22}
.footer{margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;font-size:12px;color:#666}
.highlight{background-color:#fff3cd;padding:10px;border-left:4px solid #ffc107;margin:15px 0}
.welcome-box{background-color:#e8f4f8;border:1px solid #bee5eb;border-radius:4px;padding:20px;margin:20px 0}
.detail-box{background-color:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;padding:15px;margin:20px 0}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e9ecef}
.detail-row:last-child{border-bottom:none}
.detail-label{font-weight:bold;color:#495057}
.detail-value{color:#6c757d}
.info-box{background-color:#f8f9fa;border-left:4px solid #6c757d;padding:15px;margin:20px 0}
.success-box{background-color:#d4edda;border:1px solid #c3e6cb;border-radius:4px;padding:15px;margin:20px 0;text-align:center}
.checkmark{font-size:48px;color:#27ae60}
`
  .replace(/\n/g, '')
  .trim()
