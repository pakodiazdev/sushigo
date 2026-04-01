.PHONY: help e2e-ui cypress-ui cypress-run cypress-run-headed cypress-spec cypress-debug cypress-build chrome-clear-hsts ssl-info hosts-setup db-seed e2e-up e2e-down e2e-logs e2e-restart

# Colores para output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m # No Color

help: ## Mostrar esta ayuda
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

db-seed: ## Ejecutar seeders de base de datos
	@echo "$(GREEN)Ejecutando seeders...$(NC)"
	@docker compose exec app php artisan db:seed
	@echo "$(GREEN)✅ Seeders completados$(NC)"

e2e-up: ## Iniciar solo el contenedor test_e2e (usa pgsql y nginx del stack principal)
	@echo "$(GREEN)Iniciando contenedor E2E...$(NC)"
	@docker compose -f docker-compose.e2e.yml up -d test_e2e
	@echo "$(GREEN)Esperando a que el servicio esté listo...$(NC)"
	@sleep 5
	@docker compose -f docker-compose.e2e.yml ps test_e2e
	@echo "$(GREEN)✅ Contenedor E2E iniciado$(NC)"
	@echo "$(YELLOW)Accede a: https://sushigo.e2e.local$(NC)"
	@echo "$(YELLOW)Nota: Asegúrate de que nginx y pgsql del stack principal estén corriendo$(NC)"

e2e-down: ## Detener contenedor E2E
	@echo "$(GREEN)Deteniendo contenedor E2E...$(NC)"
	@docker compose -f docker-compose.e2e.yml down test_e2e
	@echo "$(GREEN)✅ Contenedor E2E detenido$(NC)"

e2e-restart: ## Reiniciar contenedor E2E
	@echo "$(GREEN)Reiniciando contenedor E2E...$(NC)"
	@docker compose -f docker-compose.e2e.yml restart test_e2e
	@echo "$(GREEN)✅ Contenedor E2E reiniciado$(NC)"

e2e-logs: ## Ver logs del contenedor E2E
	@docker compose -f docker-compose.e2e.yml logs -f test_e2e

e2e-ui: ## Abrir Cypress UI (interfaz interactiva con VNC en http://localhost:6080)
	@echo "$(GREEN)Verificando contenedor cypress-ui...$(NC)"
	@if ! docker ps | grep -q cypress-ui; then \
		echo "$(YELLOW)Iniciando contenedor cypress-ui...$(NC)"; \
		docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d cypress-ui 2>&1 | grep -v "mounts denied" || true; \
		sleep 3; \
	fi
	@echo "$(GREEN)Abriendo Cypress UI...$(NC)"
	@docker exec -it cypress-ui npx cypress open || echo "$(RED)Error: Asegúrate de que el contenedor cypress-ui esté corriendo$(NC)"
# --config-file cypress.devtest.config.ts
cypress-ui: e2e-ui ## Alias de e2e-ui

cypress-spec: ## Ejecutar un spec con headed mode: make cypress-spec SPEC=login [GREP="Logout"]
	@if [ -z "$(SPEC)" ]; then echo "$(RED)Uso: make cypress-spec SPEC=<nombre> [GREP='texto']$(NC)"; exit 1; fi
	@echo "$(GREEN)Ejecutando spec: $(SPEC).cy.ts$(if $(GREP), [grep: $(GREP)])...$(NC)"
	@docker exec -it cypress-ui bash -c \
		"npx cypress run --headed --browser chrome --spec 'cypress/e2e/$(SPEC).cy.ts'$(if $(GREP), --env grep='$(GREP)')"

cypress-debug: ## Abrir spec en modo interactivo (navegador queda abierto): make cypress-debug SPEC=login [GREP="Logout"]
	@if [ -z "$(SPEC)" ]; then echo "$(RED)Uso: make cypress-debug SPEC=<nombre> [GREP='texto']$(NC)"; exit 1; fi
	@echo "$(GREEN)Abriendo spec en modo debug: $(SPEC).cy.ts$(if $(GREP), [grep: $(GREP)])...$(NC)"
	@echo "$(YELLOW)Navegador quedará abierto al terminar — ver VNC en http://localhost:6080$(NC)"
	@docker exec -it cypress-ui bash -c \
		"npx cypress open --browser chrome --e2e --config specPattern='cypress/e2e/$(SPEC).cy.ts'$(if $(GREP), --env grep='$(GREP)')"

cypress-run: ## Ejecutar tests de Cypress en modo headless
	@echo "$(GREEN)Ejecutando tests de Cypress...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.e2e.yml run --rm cypress

cypress-run-headed: cypress-up ## Ejecutar TODOS los tests con navegador visible (ver en VNC http://localhost:6080)
	@echo "$(GREEN)Ejecutando todos los tests en modo headed (VNC: http://localhost:6080)...$(NC)"
	@docker exec -it cypress-ui npx cypress run --headed --browser chrome

cypress-build: ## Reconstruir imagen de Cypress UI
	@echo "$(GREEN)Reconstruyendo imagen de Cypress UI...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.e2e.yml build cypress-ui

cypress-up: ## Iniciar servicio cypress-ui (requiere http://localhost:6080)
	@echo "$(GREEN)Iniciando Cypress UI...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d cypress-ui
	@echo "$(YELLOW)Accede a: http://localhost:6080$(NC)"

cypress-down: ## Detener servicio cypress-ui
	@echo "$(GREEN)Deteniendo Cypress UI...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.e2e.yml down cypress-ui

cypress-logs: ## Ver logs de cypress-ui
	@docker compose -f docker-compose.yml -f docker-compose.e2e.yml logs -f cypress-ui

chrome-clear-hsts: ## Instrucciones para limpiar HSTS de Chrome
	@echo "$(RED)============================================$(NC)"
	@echo "$(YELLOW)Para limpiar la caché HSTS de Chrome:$(NC)"
	@echo ""
	@echo "$(GREEN)Método 1 - Borrar HSTS específico:$(NC)"
	@echo "  1. Abre Chrome y ve a: $(YELLOW)chrome://net-internals/#hsts$(NC)"
	@echo "  2. En 'Delete domain security policies'"
	@echo "  3. Escribe: $(YELLOW)localhost$(NC) o $(YELLOW)dev$(NC)"
	@echo "  4. Click en 'Delete'"
	@echo ""
	@echo "$(GREEN)Método 2 - Limpiar toda la caché:$(NC)"
	@echo "  1. Chrome > Settings > Privacy and security"
	@echo "  2. Clear browsing data > Advanced"
	@echo "  3. Selecciona 'Cached images and files'"
	@echo "  4. Click 'Clear data'"
	@echo ""
	@echo "$(GREEN)Método 3 - Modo incógnito:$(NC)"
	@echo "  $(YELLOW)Cmd+Shift+N$(NC) (Mac) o $(YELLOW)Ctrl+Shift+N$(NC) (Linux/Win)"
	@echo ""
	@echo "$(GREEN)Después de limpiar, reinicia Apache:$(NC)"
	@echo "  $(YELLOW)docker compose restart dev$(NC)"
	@echo "$(RED)============================================$(NC)"

ssl-info: ## Mostrar información de certificados SSL
	@echo "$(GREEN)📜 Información de Certificados SSL$(NC)"
	@echo ""
	@if [ -f docker/app/config/dev/cert/sushigo.local.crt ]; then \
		echo "$(GREEN)✓ Certificados generados$(NC)"; \
		echo "  - docker/app/config/dev/cert/sushigo.local.crt"; \
		echo "  - docker/app/config/dev/cert/sushigo.local-key.pem"; \
		echo "  - docker/app/config/dev/cert/rootCA.pem"; \
		echo ""; \
		echo "$(YELLOW)📋 Para instalar el certificado:$(NC)"; \
		echo "  $(GREEN)Ver:$(NC) docker/app/config/dev/cert/README.md"; \
	else \
		echo "$(RED)✗ Certificados no generados$(NC)"; \
		echo "  Ejecuta: $(YELLOW)docker compose up -d --build dev$(NC)"; \
	fi

hosts-setup: ## Agregar sushigo.local al archivo hosts
	@echo "$(YELLOW)Configuración de /etc/hosts$(NC)"
	@echo ""
	@echo "$(GREEN)Agrega esta línea a tu archivo hosts:$(NC)"
	@echo "$(YELLOW)127.0.0.1  sushigo.local$(NC)"
	@echo ""
	@echo "$(GREEN)Ubicación del archivo:$(NC)"
	@echo "  $(YELLOW)Windows:$(NC) C:\\Windows\\System32\\drivers\\etc\\hosts"
	@echo "  $(YELLOW)Mac/Linux:$(NC) /etc/hosts"
	@echo ""
	@echo "$(GREEN)Comando para editar (Mac/Linux):$(NC)"
	@echo "  $(YELLOW)sudo nano /etc/hosts$(NC)"
	@echo ""
	@echo "$(RED)Después de agregar, accede a:$(NC)"
	@echo "  $(GREEN)https://sushigo.local$(NC)"
