/**
 * Supplier catalog happy paths (#431).
 *
 * The API calls in before() only prepare catalog records that the core seeder does not provide.
 * User-visible supplier and offering behavior is exercised exclusively through the UI. Validation,
 * authorization, API contracts, and error responses belong to functional/unit tests.
 *
 * Run with: make cypress-devlab-spec SPEC=suppliers-catalog
 */
import users from '../fixtures/users.json'

const { email, password } = users.admin
const apiUrl =
  Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const supplierName = 'Cypress Mariscos del Pacífico'
const editedSupplierName = 'Cypress Mariscos del Golfo'
const supplierCode = 'CYP-PACIFICO'
const offeringSupplierName = 'Cypress Proveedor de Ofertas'
const offeringSupplierCode = 'CYP-OFFERINGS'
const categoryName = 'Cypress Insumos de Proveedor'
const productName = 'Cypress Arroz para Sushi'
const variantName = 'Cypress Arroz 20 kg'
const variantCode = 'CYP-SUP-RICE-20KG'
const templateName = 'Cypress Caja x20 kg'
const packageBarcode = '7501234567897'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email, password },
  }).then((loginResponse) => {
    const headers = {
      Authorization: `Bearer ${loginResponse.body.data.token as string}`,
    }

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory/suppliers`,
      headers,
      body: { code: offeringSupplierCode, name: offeringSupplierName },
    })

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory-categories`,
      headers,
      body: { name: categoryName },
    }).then((categoryResponse) => {
      const categoryId = categoryResponse.body.data.id as string

      cy.request({
        method: 'POST',
        url: `${apiUrl}/units-of-measure`,
        headers,
        body: { code: 'KG', name: 'Kilogram', symbol: 'kg' },
      }).then(() => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/units-of-measure?per_page=100`,
          headers,
        }).then((uomsResponse) => {
          const uom = (
            uomsResponse.body.data as Array<{ id: string; code: string }>
          ).find((candidate) => candidate.code === 'KG')
          expect(uom, 'prepared unit of measure').to.exist
          const uomId = uom!.id

          cy.request({
            method: 'POST',
            url: `${apiUrl}/inventory/purchase-presentation-templates`,
            headers,
            body: {
              code: 'CYP_SUP_BOX_20',
              name: templateName,
              package_type: 'BOX',
              base_unit_quantity: 20,
              compatible_dimension_uom_id: uomId,
            },
          }).then((templateResponse) => {
            const templateId = templateResponse.body.data.id as string

            cy.request({
              method: 'POST',
              url: `${apiUrl}/inventory/products`,
              headers,
              body: { name: productName, inventory_category_id: categoryId },
            }).then((productResponse) => {
              const productId = productResponse.body.data.id as string

              cy.request({
                method: 'POST',
                url: `${apiUrl}/inventory/products/${productId}/variants`,
                headers,
                body: { name: variantName, code: variantCode, uom_id: uomId },
              }).then((variantResponse) => {
                const variantId = variantResponse.body.data.id as string

                cy.request({
                  method: 'POST',
                  url: `${apiUrl}/inventory/products/${productId}/variants/${variantId}/purchase-presentations`,
                  headers,
                  body: {
                    template_id: templateId,
                    package_barcode: packageBarcode,
                  },
                })
              })
            })
          })
        })
      })
    })
  })
})

describe('Supplier catalog', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/inventario/proveedores')
    cy.contains('h1', 'Proveedores', { timeout: 10_000 }).should('be.visible')
    cy.get('input[placeholder="Buscar por nombre o código..."]', {
      timeout: 10_000,
    }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('creates, finds, edits, deactivates, and filters a supplier', () => {
    cy.contains('button', 'Nuevo proveedor').click()
    cy.contains('h2', 'Nuevo proveedor').should('be.visible')

    cy.get('input[aria-label="Código"]').type(supplierCode)
    cy.get('input[aria-label="Nombre del proveedor"]').type(supplierName)
    cy.get('input[aria-label="Contacto"]').type('Ana Compras')
    cy.get('input[aria-label="Correo"]').type('ana@example.com')
    cy.get('input[aria-label="Teléfono"]').type('5551234567')
    cy.contains('button', 'Crear proveedor').click()

    cy.contains('Proveedor creado', { timeout: 10_000 }).should('be.visible')
    cy.get('input[placeholder="Buscar por nombre o código..."]').type(
      supplierCode,
    )
    cy.contains(supplierName, { timeout: 10_000 }).click()
    cy.contains('h2', 'Detalle del proveedor').should('be.visible')
    cy.contains('Aún no hay ofertas registradas').should('be.visible')

    cy.contains('button', 'Editar').click()
    cy.contains('h2', 'Editar proveedor').should('be.visible')
    cy.get('input[aria-label="Nombre del proveedor"]')
      .clear()
      .type(editedSupplierName)
    cy.get('input[aria-label="Contacto"]').clear().type('Luis Compras')
    cy.contains('button', 'Actualizar proveedor').click()

    cy.contains('Proveedor actualizado', { timeout: 10_000 }).should(
      'be.visible',
    )
    cy.contains(editedSupplierName, { timeout: 10_000 }).click()
    cy.contains('h2', 'Detalle del proveedor').should('be.visible')
    cy.contains('Luis Compras').should('be.visible')

    cy.contains('button', 'Desactivar').click()
    cy.contains('Proveedor desactivado', { timeout: 10_000 }).should(
      'be.visible',
    )
    cy.contains('span', 'Inactivo').should('be.visible')

    cy.get('body').type('{esc}')
    cy.contains('label', 'Estado:').parent().find('select').select('Inactivos')
    cy.contains(editedSupplierName, { timeout: 10_000 }).should('be.visible')
  })

  it('creates, edits, and deactivates a supplier offering', () => {
    cy.get('input[placeholder="Buscar por nombre o código..."]').type(
      offeringSupplierCode,
    )
    cy.contains(offeringSupplierName, { timeout: 10_000 }).click()
    cy.contains('h2', 'Detalle del proveedor').should('be.visible')
    cy.contains('button', 'Oferta').click()
    cy.contains('h2', 'Nueva oferta').should('be.visible')

    // Producto/Variante are server-side searched (#506) — narrow the option list by typing the
    // name into the search box above each <select> before picking, so the target is on the page
    // even once the catalog outgrows one page of results.
    cy.get('input[placeholder="Busca un producto por nombre…"]').type(productName)
    cy.get('select[aria-label="Producto"]', { timeout: 10_000 })
      .should('contain.text', productName)
      .select(productName)
    cy.get('input[placeholder="Busca una variante por nombre o código…"]').type(variantName)
    cy.get('select[aria-label="Variante"]', { timeout: 10_000 })
      .should('not.be.disabled')
      .should('contain.text', `${variantName} (${variantCode})`)
      .select(`${variantName} (${variantCode})`)
    cy.get('select[aria-label="Presentación de compra"]', { timeout: 10_000 })
      .should('not.be.disabled')
      .select(templateName)
    cy.get('input[aria-label="Código del producto según el proveedor"]').type(
      'ARROZ-20KG',
    )
    cy.get('input[aria-label="Precio cotizado"]').clear().type('480')
    cy.get('input[aria-label="Moneda"]').clear().type('mxn')
    cy.get('input[aria-label="Vigente desde"]').type('2026-08-01')
    cy.get('input[aria-label="Vigente hasta"]').type('2026-12-31')
    cy.get('input[aria-label="Cantidad mínima"]').clear().type('5')
    cy.get('input[aria-label="Entrega (días)"]').type('3')
    cy.contains('button', 'Crear oferta').click()

    cy.contains('Oferta creada', { timeout: 10_000 }).should('be.visible')
    cy.contains('button', `${productName} · ${variantName}`, {
      timeout: 10_000,
    })
      .within(() => {
        cy.contains(templateName).should('be.visible')
        cy.contains('MXN 480').should('be.visible')
        cy.contains('mín. 5').should('be.visible')
        cy.contains('span', 'Activo').should('be.visible')
      })
      .click()

    cy.contains('h2', 'Editar oferta').should('be.visible')
    cy.contains(`${productName} · ${variantName} · ${templateName}`).should(
      'be.visible',
    )
    cy.get('input[aria-label="Código del producto según el proveedor"]')
      .clear()
      .type('ARROZ-PREFERENTE')
    cy.get('input[aria-label="Precio cotizado"]').clear().type('510')
    cy.get('input[aria-label="Entrega (días)"]').clear().type('2')
    cy.contains('label', 'Oferta activa').click()
    cy.contains('button', 'Actualizar oferta').click()

    cy.contains('Oferta actualizada', { timeout: 10_000 }).should('be.visible')
    cy.contains('button', `${productName} · ${variantName}`, {
      timeout: 10_000,
    }).within(() => {
      cy.contains('MXN 510').should('be.visible')
      cy.contains('span', 'Inactivo').should('be.visible')
    })
  })
})
