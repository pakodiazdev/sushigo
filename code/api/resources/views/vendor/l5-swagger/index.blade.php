<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $documentationTitle }}</title>
    <link rel="stylesheet" type="text/css" href="{{ l5_swagger_asset($documentation, 'swagger-ui.css') }}">
    <link rel="icon" type="image/png" href="{{ l5_swagger_asset($documentation, 'favicon-32x32.png') }}" sizes="32x32"/>
    <link rel="icon" type="image/png" href="{{ l5_swagger_asset($documentation, 'favicon-16x16.png') }}" sizes="16x16"/>
    <style>
    html {
        box-sizing: border-box;
        overflow: -moz-scrollbars-vertical;
        overflow-y: scroll;
    }
    *, *:before, *:after {
        box-sizing: inherit;
    }
    body {
        margin:0;
        background: #fafafa;
    }

    /* Custom Login Styles */
    #custom-login-container {
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 1000;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none;
        min-width: 320px;
        border: 1px solid #e0e0e0;
    }
    #custom-login-container.show {
        display: block;
    }
    #login-trigger-btn {
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 1001;
        background: #4990e2;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    #login-trigger-btn:hover {
        background: #357abd;
    }
    #login-trigger-btn.logged-in {
        background: #49cc90;
    }
    .login-form-group {
        margin-bottom: 15px;
    }
    .login-form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        font-size: 14px;
        color: #333;
    }
    .login-form-group input {
        width: 100%;
        padding: 10px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
    }
    .login-form-group input:focus {
        outline: none;
        border-color: #4990e2;
    }
    .login-btn {
        background: #49cc90;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-weight: bold;
        font-size: 14px;
    }
    .login-btn:hover {
        background: #3da876;
    }
    .logout-btn {
        background: #f93e3e;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-weight: bold;
        font-size: 14px;
        margin-top: 10px;
    }
    .logout-btn:hover {
        background: #d63030;
    }
    .login-status {
        margin-top: 12px;
        padding: 10px;
        border-radius: 4px;
        font-size: 13px;
    }
    .login-status.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    .login-status.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    .user-info {
        margin-top: 10px;
        padding: 12px;
        background: #e7f3ff;
        border-radius: 4px;
        font-size: 13px;
        border: 1px solid #b3d9ff;
    }
    #custom-login-container h3 {
        margin-top: 0;
        margin-bottom: 15px;
        color: #333;
        font-size: 18px;
    }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>

    <!-- Custom Login Button -->
    <button id="login-trigger-btn" onclick="toggleLoginForm()">🔐 Login</button>

    <!-- Custom Login Form -->
    <div id="custom-login-container">
        <div id="login-form-section">
            <h3>Login to API</h3>
            <div class="login-form-group">
                <label for="login-email">Email:</label>
                <input type="email" id="login-email" placeholder="demo@sushigo.com" value="demo@sushigo.com" />
            </div>
            <div class="login-form-group">
                <label for="login-password">Password:</label>
                <input type="password" id="login-password" placeholder="Enter password" value="demo123456" />
            </div>
            <button class="login-btn" onclick="performLogin()">Login</button>
            <div id="login-status"></div>
        </div>

        <div id="logout-section" style="display: none;">
            <h3>Logged In</h3>
            <div class="user-info" id="user-info"></div>
            <button class="logout-btn" onclick="performLogout()">Logout</button>
        </div>
    </div>

    <script src="{{ l5_swagger_asset($documentation, 'swagger-ui-bundle.js') }}"></script>
    <script src="{{ l5_swagger_asset($documentation, 'swagger-ui-standalone-preset.js') }}"></script>
    <script>
        window.onload = function() {
            const urls = [];
            @foreach($urlsToDocs as $title => $url)
            urls.push({name: "{{ $title }}", url: "{{ $url }}"});
            @endforeach

            const ui = SwaggerUIBundle({
                dom_id: '#swagger-ui',
                urls: urls,
                "urls.primaryName": "{{ $documentationTitle }}",
                operationsSorter: {!! isset($operationsSorter) ? '"' . $operationsSorter . '"' : 'null' !!},
                configUrl: {!! isset($configUrl) ? '"' . $configUrl . '"' : 'null' !!},
                validatorUrl: {!! isset($validatorUrl) ? '"' . $validatorUrl . '"' : 'null' !!},
                oauth2RedirectUrl: "{{ route('l5-swagger.'.$documentation.'.oauth2_callback', [], $useAbsolutePath) }}",
                requestInterceptor: function(request) {
                    request.headers['X-CSRF-TOKEN'] = '{{ csrf_token() }}';
                    const token = localStorage.getItem('api_token');
                    if (token) {
                        request.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return request;
                },
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                docExpansion: "{!! config('l5-swagger.defaults.ui.display.doc_expansion', 'none') !!}",
                deepLinking: true,
                filter: {!! config('l5-swagger.defaults.ui.display.filter') ? 'true' : 'false' !!},
                persistAuthorization: "{!! config('l5-swagger.defaults.ui.authorization.persist_authorization') ? 'true' : 'false' !!}",
            });

            window.ui = ui;
            checkLoginStatus();

            @if(in_array('oauth2', array_column(config('l5-swagger.defaults.securityDefinitions.securitySchemes'), 'type')))
            ui.initOAuth({
                usePkceWithAuthorizationCodeGrant: "{!! (bool)config('l5-swagger.defaults.ui.authorization.oauth2.use_pkce_with_authorization_code_grant') !!}"
            });
            @endif
        };

        function toggleLoginForm() {
            const container = document.getElementById('custom-login-container');
            container.classList.toggle('show');
        }

        function updateAuthorizeLocks() {
            const token = localStorage.getItem('api_token');

            if (window.ui && window.ui.authActions) {
                if (token) {
                    window.ui.authActions.authorize({
                        bearer: {
                            name: "bearer",
                            schema: { type: "http", scheme: "bearer" },
                            value: token
                        }
                    });
                } else {
                    window.ui.authActions.logout(["bearer"]);
                }
            }

            setTimeout(function() {
                const authButtons = document.querySelectorAll('.authorization__btn');
                authButtons.forEach(function(btn) {
                    if (token) {
                        if (!btn.classList.contains('locked')) {
                            btn.classList.add('locked');
                        }
                        const svg = btn.querySelector('svg');
                        if (svg) {
                            svg.style.fill = '#49cc90';
                        }
                    } else {
                        btn.classList.remove('locked');
                        const svg = btn.querySelector('svg');
                        if (svg) {
                            svg.style.fill = '';
                        }
                    }
                });
            }, 300);
        }

        function checkLoginStatus() {
            const token = localStorage.getItem('api_token');
            const userInfo = localStorage.getItem('user_info');
            const loginBtn = document.getElementById('login-trigger-btn');

            if (token && userInfo) {
                const user = JSON.parse(userInfo);
                document.getElementById('login-form-section').style.display = 'none';
                document.getElementById('logout-section').style.display = 'block';
                document.getElementById('user-info').innerHTML = '<strong>Name:</strong> ' + user.name + '<br><strong>Email:</strong> ' + user.email;
                loginBtn.classList.add('logged-in');
                loginBtn.textContent = '✓ Logged In';
                updateAuthorizeLocks();
            } else {
                document.getElementById('login-form-section').style.display = 'block';
                document.getElementById('logout-section').style.display = 'none';
                loginBtn.classList.remove('logged-in');
                loginBtn.textContent = '🔐 Login';
                updateAuthorizeLocks();
            }
        }

        async function performLogin() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const statusDiv = document.getElementById('login-status');

            if (!email || !password) {
                statusDiv.className = 'login-status error';
                statusDiv.textContent = 'Please enter email and password';
                return;
            }

            statusDiv.className = 'login-status';
            statusDiv.textContent = 'Logging in...';

            try {
                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email: email, password: password })
                });

                const data = await response.json();

                if (response.ok && data.data && data.data.token) {
                    localStorage.setItem('api_token', data.data.token);
                    localStorage.setItem('user_info', JSON.stringify(data.data.user));

                    statusDiv.className = 'login-status success';
                    statusDiv.textContent = 'Login successful! Token saved.';

                    setTimeout(function() {
                        checkLoginStatus();
                        statusDiv.textContent = '';
                    }, 1500);
                } else {
                    statusDiv.className = 'login-status error';
                    statusDiv.textContent = data.message || 'Login failed. Please check your credentials.';
                }
            } catch (error) {
                statusDiv.className = 'login-status error';
                statusDiv.textContent = 'Error: ' + error.message;
            }
        }

        async function performLogout() {
            const token = localStorage.getItem('api_token');

            if (token) {
                try {
                    await fetch('/api/v1/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Accept': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error('Logout request failed:', error);
                }
            }

            localStorage.removeItem('api_token');
            localStorage.removeItem('user_info');
            checkLoginStatus();
            document.getElementById('custom-login-container').classList.remove('show');
        }

        document.addEventListener('click', function(event) {
            const container = document.getElementById('custom-login-container');
            const trigger = document.getElementById('login-trigger-btn');

            if (!container.contains(event.target) && event.target !== trigger) {
                container.classList.remove('show');
            }
        });

        const observer = new MutationObserver(function() {
            updateAuthorizeLocks();
        });

        setTimeout(function() {
            const targetNode = document.getElementById('swagger-ui');
            if (targetNode) {
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
            }
        }, 1000);
    </script>
</body>
</html>
