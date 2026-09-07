<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Management System API</title>
    <style>
        :root { color-scheme: light; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Inter, system-ui, sans-serif;
            background: #f3f4f6;
            color: #111827;
        }
        .card {
            width: min(440px, calc(100% - 32px));
            padding: 32px;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        }
        h1 { margin: 0 0 8px; font-size: 20px; color: #902d30; }
        p { margin: 0 0 16px; color: #6b7280; line-height: 1.5; }
        a { color: #902d30; font-weight: 600; }
        code { font-size: 13px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Project Management System</h1>
        <p>The API is running. Open the React app on port 5173 to use the portal.</p>
        <p><a href="http://localhost:5173">http://localhost:5173</a></p>
        <p><code>GET /api</code> &nbsp;·&nbsp; <code>POST /api/login</code></p>
    </div>
</body>
</html>
