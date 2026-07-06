const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// 1. Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🌟 2. TRUCO CRÍTICO: Habilitar los lectores de JSON ARRIBA de las rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔌 3. Configuración de conexión con Clever Cloud
const db = mysql.createConnection({
    host: 'bmnj8uvb8uf33uyafbjm-mysql.services.clever-cloud.com', 
    user: 'ugqnvchebaoj1muj',      
    password: 'S5LZpQzSFbKJE2e9MvP6', 
    database: 'bmnj8uvb8uf33uyafbjm',  
    port: 3306
});

db.connect(err => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        return;
    }
    console.log('✅ Conectado exitosamente a MySQL en Clever Cloud');
});
// =========================================================================
// 🚚 ENDPOINT CORREGIDO: PROCESAR COMPRAS A PROVEEDORES (ENTRADA DE STOCK)
// =========================================================================
app.post('/api/compras-proveedor', (req, res) => {
    const { proveedor, detalles } = req.body;
    
    console.log(`🚚 Recibiendo entrada de stock del proveedor: ${proveedor || 'Genérico'}`);

    if (!detalles || detalles.length === 0) {
        return res.status(400).json({ error: "No hay productos en la lista de compra" });
    }

    let consultasCompletadas = 0;
    let huboError = false;

    detalles.forEach(item => {
        // ✅ USAMOS 'id' que es la columna real de tu tabla
        const querySumarStock = 'UPDATE productos SET cantidad = cantidad + ? WHERE id = ?';
        
        // Convertimos a número entero de JavaScript seguro (soporta valores mayores que un int de Java)
        const idProducto = Number(item.producto_id);
        const cantidadSumar = parseInt(item.cantidad);

        db.query(querySumarStock, [cantidadSumar, idProducto], (err, result) => {
            consultasCompletadas++;

            if (err) {
                console.error(`❌ Error sumando stock para ID ${item.producto_id}:`, err.message);
                huboError = true;
            }

            if (consultasCompletadas === detalles.length) {
                if (huboError) {
                    return res.status(500).json({ error: "La compra se procesó con errores en algunos artículos" });
                }
                console.log("✅ ¡Entrada de stock registrada exitosamente en Clever Cloud!");
                res.status(201).json({ status: "success", message: "🎉 ¡Stock reabastecido con éxito!" });
            }
        });
    });
});
// =========================================================================
// 🔐 ENDPOINT: Inicio de sesión dinámico desde Base de Datos (Con Roles)
// =========================================================================
app.post('/api/login', (req, res) => {
    console.log("Datos recibidos en Login:", req.body);
    
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const query = 'SELECT id, usuario, rol FROM usuarios WHERE usuario = ? AND password = ?';

    db.query(query, [usuario, password], (err, result) => {
        if (err) {
            console.error("ERROR CRÍTICO EN MYSQL:", err);
            return res.status(500).json({ error: "Error interno del servidor en la consulta SQL", detalle: err.message });
        }

        if (result.length > 0) {
            return res.status(200).json({ 
                mensaje: "Login exitoso", 
                usuario: result[0].usuario,
                rol: result[0].rol 
            });
        } else {
            return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
        }
    });
});

// =========================================================================
// 🧠 RUTA 100% MATEMÁTICA Y SIN LÍMITES: ANÁLISIS PREDICTIVO (SIN IA)
// =========================================================================
app.get('/api/inteligencia', (req, res) => {
    
    // 1. Consultamos productos en stock crítico (menos de 5 unidades)
    const sqlStockCritico = "SELECT nombre, cantidad, precio FROM productos WHERE cantidad <= 5 ORDER BY cantidad ASC LIMIT 5";
    
    db.query(sqlStockCritico, (errCritico, productosCriticos) => {
        if (errCritico) {
            console.error("❌ Error base de datos (Stock):", errCritico);
            return res.status(500).json({ mensaje: "Error al consultar inventario", detalle: errCritico.message });
        }

        // 2. Calculamos el valor del inventario para la proyección de ventas
        const sqlResumenVentas = "SELECT CAST(IFNULL(SUM(cantidad * precio), 0) AS DECIMAL(10,2)) AS valor_inventario FROM productos";

        db.query(sqlResumenVentas, (errVentas, resultadoVentas) => {
            if (errVentas) {
                console.error("❌ Error base de datos (Ventas):", errVentas);
                return res.status(500).json({ mensaje: "Error al calcular ventas", detalle: errVentas.message });
            }

            const valorInventario = parseFloat(resultadoVentas[0].valor_inventario) || 0;
            // Tu misma fórmula financiera predictiva
            const ventasMes = parseFloat(((valorInventario * 0.12) * 24).toFixed(2));

            // 3. 📝 LÓGICA DE TEXTO AUTOMÁTICO (Reemplaza a la IA)
            let textoRecomendaciones = "";
            
            if (productosCriticos.length === 0) {
                textoRecomendaciones = `✅ ¡Excelente trabajo con el stock!\n\nTu inventario está muy sano, no tienes productos en riesgo de agotarse.\n\n📈 Predicción:\nBasado en tus datos actuales, estimamos que el flujo de ventas alcance los S/ ${ventasMes} este mes. ¡Sigue así!`;
            } else {
                // Extraemos solo los nombres para que el texto se lea natural
                const nombresCriticos = productosCriticos.map(p => p.nombre.substring(0, 20) + "...").join(", ");
                
                textoRecomendaciones = `⚠️ ¡Alerta de Inventario!\n\nTienes ${productosCriticos.length} productos a punto de agotarse (Ej: ${nombresCriticos}).\n\n💡 Recomendaciones:\n1. Reabastece urgente estos artículos para no perder clientes frecuentes.\n2. Tu proyección mensual es de S/ ${ventasMes}. ¡Evita que la falta de stock congele tus ganancias!`;
            }

            // 4. 📈 LÓGICA DEL GRÁFICO (Curva ascendente matemática de 7 puntos)
            const datosGraficoPrediccion = [
                Math.round(ventasMes * 0.3),  // Hace 3 semanas
                Math.round(ventasMes * 0.45), // Hace 2 semanas
                Math.round(ventasMes * 0.65), // Hace 1 semana
                Math.round(ventasMes * 0.85), // Días recientes
                Math.round(ventasMes),        // HOY
                Math.round(ventasMes * 1.15), // Proyección futuro cercano (+15%)
                Math.round(ventasMes * 1.3)   // Proyección meta final (+30%)
            ];

            // 5. Enviamos la respuesta a Android. 
            // ⚡ ¡Responderá al instante!
            return res.json({
                recomendaciones: textoRecomendaciones,
                prediccionesGrafico: datosGraficoPrediccion
            });
        });
    });
});

// 🧑‍💼 NUEVA RUTA: REGISTRAR EMPLEADO
// ==========================================
app.post('/api/usuarios', (req, res) => {
    // Extraemos los datos que envía Android
    const { usuario, password, rol } = req.body;

    // Validación básica
    if (!usuario || !password) {
        return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios" });
    }

    // Por seguridad, si no llega un rol desde la app, forzamos que sea Trabajador
    const rolAsignado = rol ? rol : 'Trabajador';

    // Ajusta los nombres de las columnas (usuario, password, rol) 
    // si en tu base de datos se llaman diferente (ej. 'clave', 'nombre_usuario')
    const sql = "INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)";
    
    db.query(sql, [usuario, password, rolAsignado], (err, result) => {
        if (err) {
            console.error("Error al registrar el empleado:", err);
            return res.status(500).json({ mensaje: "Error en la base de datos al crear el usuario" });
        }
        
        console.log("✅ Nuevo empleado registrado con ID:", result.insertId);
        res.status(201).json({ 
            mensaje: "Cuenta creada con éxito",
            id: result.insertId 
        });
    });
});
// =========================================================================
// 📦 ENDPOINTS: Gestión de Productos de Agropets
// =========================================================================

// 📥 Recibir y registrar producto desde la App Móvil (POST)
app.post('/api/productos', (req, res) => {
    console.log("📥 Datos recibidos desde Android:", req.body);
    const { nombre, cantidad, precio, categoria } = req.body; 

    const categoriaFinal = categoria || 'General';

    const query = 'INSERT INTO productos (nombre, cantidad, precio, categoria) VALUES (?, ?, ?, ?)';
    db.query(query, [nombre, parseInt(cantidad), parseFloat(precio), categoriaFinal], (err, result) => {
        if (err) {
            console.error("❌ Error de MySQL:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("✅ ¡Producto guardado con éxito!");
        res.status(201).json({ status: "success", message: '📦 Producto registrado con éxito' });
    });
});

// 📤 Consultar productos filtrados u ordenados por categoría para el catálogo
app.get('/api/productos', (req, res) => {
    const categoriaFiltro = req.query.categoria;

    if (categoriaFiltro) {
        const queryFiltro = 'SELECT * FROM productos WHERE categoria = ? ORDER BY nombre ASC';
        db.query(queryFiltro, [categoriaFiltro], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    } else {
        db.query('SELECT * FROM productos ORDER BY categoria ASC, nombre ASC', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    }
});

// 🔄 Actualizar un producto existente por su ID (PUT)
app.put('/api/productos/:id', (req, res) => {
    const idProducto = req.params.id;
    const { nombre, cantidad, precio, categoria } = req.body; 

    console.log(`🔄 Petición de actualización para el ID: ${idProducto}`, req.body);

    const query = 'UPDATE productos SET nombre = ?, cantidad = ?, precio = ?, categoria = ? WHERE id = ?';
    const categoriaFinal = categoria || 'General';

    db.query(query, [nombre, parseInt(cantidad), parseFloat(precio), categoriaFinal, idProducto], (err, result) => {
        if (err) {
            console.error("❌ Error de MySQL al actualizar:", err.message);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        
        console.log(`✅ ¡Producto con ID ${idProducto} modificado con éxito!`);
        res.json({ status: "success", message: '📦 Stock actualizado correctamente' });
    });
});

// 🏷️ Obtener la lista única de categorías activas de Agropets
app.get('/api/categorias', (req, res) => {
    const queryCategorias = 'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL ORDER BY categoria ASC';
    
    db.query(queryCategorias, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener categorías:", err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const categoriasLimpias = results.map(row => row.categoria);
        console.log("🏷️ Categorías enviadas a Android:", categoriasLimpias);
        res.json(categoriasLimpias);
    });
});

// 📊 ENDPOINT DE REPORTES BLINDADO CONTRA VALORES NULOS
app.get('/api/resumen', (req, res) => {
    const query = `
        SELECT 
            CAST(IFNULL(SUM(cantidad * precio), 0) AS DECIMAL(10,2)) AS valorInventario,
            CAST(IFNULL(SUM(cantidad), 0) AS SIGNED) AS totalProductos,
            CAST(COUNT(CASE WHEN cantidad < 5 THEN 1 END) AS SIGNED) AS stockBajo
        FROM productos;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error al generar reporte:", err.message);
            return res.status(500).json({ error: err.message });
        }

        const datosBase = results[0];
        
        const valorInventarioReal = parseFloat(datosBase.valorInventario) || 0;
        const totalProductosReal = parseInt(datosBase.totalProductos) || 0;
        const stockBajoReal = parseInt(datosBase.stockBajo) || 0;

        const ventasDiariasCalculadas = valorInventarioReal > 0 ? (valorInventarioReal * 0.12) : 0;
        const gananciasMensualesCalculadas = ventasDiariasCalculadas * 24;

        const reporteFinanciero = {
            valorInventario: valorInventarioReal,
            totalProductos: totalProductosReal,
            stockBajo: stockBajoReal,
            ventasHoy: parseFloat(ventasDiariasCalculadas.toFixed(2)),
            gananciasMes: parseFloat(gananciasMensualesCalculadas.toFixed(2))
        };

        console.log("📈 Analíticas despachadas a Android con éxito:", reporteFinanciero);
        res.json(reporteFinanciero);
    });
});

// =========================================================================
// 🛒 PROCESAR COMPRAS MÚLTIPLES (POST /api/ventas)
// =========================================================================
app.post('/api/ventas', (req, res) => {
    const { monto_total, detalles } = req.body;
    
    console.log(`🛒 Recibiendo venta múltiple de Agropets en la nube por: S/ ${monto_total}`);

    if (!detalles || detalles.length === 0) {
        return res.status(400).json({ error: "El carrito de compras está vacío" });
    }

    let consultasCompletadas = 0;
    let huboError = false;

    detalles.forEach(item => {
        const queryDescontarStock = 'UPDATE productos SET cantidad = cantidad - ? WHERE id = ?';
        
        db.query(queryDescontarStock, [parseInt(item.cantidad), item.producto_id], (err, result) => {
            consultasCompletadas++;

            if (err) {
                console.error(`❌ Error descontando stock para ID ${item.producto_id}:`, err.message);
                huboError = true;
            }

            if (consultasCompletadas === detalles.length) {
                if (huboError) {
                    return res.status(500).json({ error: "La venta se procesó con errores en algunos artículos" });
                }
                console.log("✅ ¡Venta múltiple registrada y stocks descontados en Clever Cloud!");
                res.status(201).json({ status: "success", message: "🎉 ¡Venta procesada con éxito!" });
            }
        });
    });
});

// =========================================================================
// 🚀 INYECTOR MASIVO HÍBRIDO Y BLINDADO (RESUELVE NOMBRES Y COLUMNAS)
// =========================================================================
app.get('/api/admin/cargar-agropets', (req, res) => {
    
    // 1. Limpiamos cualquier rastro de tablas viejas conflictivas
    db.query("DROP TABLE IF EXISTS productos;", (errDrop1) => {
        db.query("DROP TABLE IF EXISTS producto;", (errDrop2) => {
            
            // 2. Creamos la tabla 'productos' (plural) con columnas híbridas
            const sqlTablaPlural = `
                CREATE TABLE productos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nombre VARCHAR(255) NOT NULL,
                    cantidad INT NOT NULL DEFAULT 0,
                    stock INT NOT NULL DEFAULT 0,
                    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    categoria VARCHAR(100) DEFAULT 'General'
                );
            `;

            db.query(sqlTablaPlural, (errPlural) => {
                if (errPlural) return res.status(500).send("Error creando tabla plural: " + errPlural.message);

                // 3. Creamos la tabla 'producto' (singular) con la misma estructura por si acaso
                const sqlTablaSingular = `
                    CREATE TABLE producto (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        nombre VARCHAR(255) NOT NULL,
                        cantidad INT NOT NULL DEFAULT 0,
                        stock INT NOT NULL DEFAULT 0,
                        precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        categoria VARCHAR(100) DEFAULT 'General'
                    );
                `;

                db.query(sqlTablaSingular, (errSingular) => {
                    if (errSingular) return res.status(500).send("Error creando tabla singular: " + errSingular.message);

                    // Catálogo de tus 75 productos originales
                    const listaAgropets = [
                        ["Ricocan 7+ Años Adulto Raza Med/Gde x15kg", 12, 105.00, "Perros - Secos"],
                        ["Ricocan Cordero y Cereales Adulto Raza Med/Gde x22kg", 2, 150.70, "Perros - Secos"],
                        ["Ricocan Cordero y Cereales Adulto Raza Pequeña x15kg", 8, 105.00, "Perros - Secos"],
                        ["Ricocan Multisabores Adultos Todas las Razas x22kg", 1, 150.70, "Perros - Secos"],
                        ["Ricocan Original Adultos Todas las Razas x15kg", 15, 105.00, "Perros - Secos"],
                        ["Ricocan Extruido Cachorros Carne/Leche Raza Peq x15kg", 6, 109.50, "Perros - Secos"],
                        ["Ricocan Extruido Cachorros Carne/Leche Raza Med/Gde x22kg", 4, 157.50, "Perros - Secos"],
                        ["Supercan Cachorros Carne y Leche x15kg", 10, 97.50, "Perros - Secos"],
                        ["Supercan Adulto Carne y Cereales x25kg", 3, 140.00, "Perros - Secos"],
                        ["Supercan Adulto Sabor Cordero x15kg", 9, 90.00, "Perros - Secos"],
                        ["Supercan Adulto Buffet de Sabores x25kg", 14, 140.00, "Perros - Secos"],
                        ["Yango Sabor Carne Adulto Todas las Razas x25kg", 7, 95.00, "Perros - Secos"],
                        ["Bandido Extruido Adulto Carne x18kg", 11, 73.50, "Perros - Secos"],
                        ["Thor Carne, Hígado y Cereales Adultos x25kg", 5, 107.50, "Perros - Secos"],
                        ["Thor Carne Cachorros x25kg", 6, 112.50, "Perros - Secos"],
                        ["Mimaskot Carne, Cereales y Vegetales x15kg", 8, 93.00, "Perros - Secos"],
                        ["Mimaskot Adulto Carne, Pollo y Cereales Raza Peq x15kg", 4, 93.00, "Perros - Secos"],
                        ["Mimaskot Adulto Carne, Pollo y Cereales Raza Peq x25kg", 2, 145.00, "Perros - Secos"],
                        ["Mimaskot Carne/Cereales Cachorro Raza Med/Gde x15kg", 6, 93.00, "Perros - Secos"],
                        ["Mimaskot Carne/Cereales Cachorro Raza Med/Gde x25kg", 3, 145.00, "Perros - Secos"],
                        ["Mimaskot Carne/Cereales Cachorro Raza Pequeña x15kg", 9, 93.00, "Perros - Secos"],
                        ["Nutrican Cachorro Perros x15kg", 11, 67.00, "Perros - Secos"],
                        ["Nutrican Adulto Perros x15kg", 14, 69.00, "Perros - Secos"],
                        ["Nutrican Adulto Perros x25kg", 5, 108.00, "Perros - Secos"],
                        ["Zeus Adulto Perros x25kg", 7, 90.00, "Perros - Secos"],
                        ["Zeus Cachorro Perros x25kg", 4, 93.00, "Perros - Secos"],
                        ["Ricocat Festival de Sabores Adulto x15kg", 8, 133.00, "Gatos - Secos"],
                        ["Ricocat Pollo, Sardina y Salmón Adulto x09kg", 2, 81.00, "Gatos - Secos"],
                        ["Ricocat Carne, Salmón y Leche Adulto x09kg", 12, 81.00, "Gatos - Secos"],
                        ["Ricocat Atún, Sardina y Trucha Adulto x09kg", 9, 81.00, "Gatos - Secos"],
                        ["Ricocat Esterilizados Adulto x09kg", 4, 81.00, "Gatos - Secos"],
                        ["Supercat Sardina, Atún y Trucha Adulto x09kg", 10, 70.50, "Gatos - Secos"],
                        ["Supercat Carne y Leche Cachorros x09kg", 3, 67.50, "Gatos - Secos"],
                        ["Ricocat Carne, Pescado y Leche Cachorro x15kg", 5, 111.00, "Gatos - Secos"],
                        ["Michicat Pollo, Sardina y Atún Adulto x09kg", 15, 85.00, "Gatos - Secos"],
                        ["Maxicat Pollo y Pescado Adulto x15kg", 7, 139.00, "Gatos - Secos"],
                        ["Mimaskot Gatitos Pollo, Carne y Leche x9kg", 6, 75.00, "Gatos - Secos"],
                        ["Mimaskot Gatos Adultos Salmón, Atún y Sardina x9kg", 10, 70.00, "Gatos - Secos"],
                        ["Mimaskot Gatos Adultos Pollo, Carne y Salmón x9kg", 8, 70.00, "Gatos - Secos"],
                        ["Nutrican Gatos Atún y Sardina x9kg", 12, 58.00, "Gatos - Secos"],
                        ["Nutrican Gatos Adultos x25kg", 3, 110.00, "Gatos - Secos"],
                        ["Arena Sanitaria Mimaskot para Gatos x5kg", 25, 13.00, "Gatos - Arena"],
                        ["Arena Sanitaria Mimaskot para Gatos x10kg", 18, 23.00, "Gatos - Arena"],
                        ["Arena Sanitaria Mimaskot para Gatos x20kg", 1, 40.00, "Gatos - Arena"],
                        ["Caja Latas Ricocan Pate/Trocitos x24und (330gr)", 4, 102.00, "Húmedos"],
                        ["Caja Latas Ricocat Húmedo Pate x24und (330gr)", 6, 115.00, "Húmedos"],
                        ["Caja Pouches Ricocan Trocitos x15und (100gr)", 20, 25.00, "Húmedos"],
                        ["Caja Pouches Ricocat Húmedo x15und (85gr)", 18, 26.00, "Húmedos"],
                        ["Caja Latas Thor Adulto/Cachorro x24und (330gr)", 3, 92.00, "Húmedos"],
                        ["Caja Latas Supercan Guisos x24und (280gr)", 5, 81.00, "Húmedos"],
                        ["Shampoo Ricocan Frasco x380ml", 25, 12.00, "Higiene"],
                        ["Shampoo Fresh Can Frasco x300ml", 30, 8.00, "Higiene"],
                        ["Snack Ricocrack Caja x12und", 10, 72.00, "Snacks"],
                        ["Super Plus Inicio Pellet 40kg (B001)", 15, 117.00, "Agrícola - Aves"],
                        ["Super Plus Crecimiento Pellet 40kg (B002)", 2, 115.00, "Agrícola - Aves"],
                        ["Super Plus Engorde Pellet 40kg (B003)", 8, 110.00, "Agrícola - Aves"],
                        ["Polvo Super Plus Inicio Harinado 40kg (B004)", 12, 99.00, "Agrícola - Aves"],
                        ["Polvo Super Plus Crecimiento Harinado 40kg (B005)", 4, 98.00, "Agrícola - Aves"],
                        ["Polvo Super Plus Engorde Harinado 40kg (B006)", 20, 94.00, "Agrícola - Aves"],
                        ["Hi Premium Buenamicyn-a Etts 40kg (B007)", 5, 130.00, "Agrícola - Aves"],
                        ["Hi Premium Buenamicyn-a 20x1kg Etts 20kg (B008)", 10, 76.00, "Agrícola - Aves"],
                        ["Hi Premium Buenamicyn-a Micro Pellet 40kg (B009)", 3, 135.00, "Agrícola - Aves"],
                        ["Hi Premium Inicio Etts 40kg (B010)", 14, 119.00, "Agrícola - Aves"],
                        ["Hi Premium Crecimiento Pellet 40kg (B011)", 6, 120.00, "Agrícola - Aves"],
                        ["Hi Premium Engorde Pellet 40kg (B012)", 11, 118.00, "Agrícola - Aves"],
                        ["Postura Hi Premium Pellet 40kg (B013)", 7, 110.00, "Agrícola - Aves"],
                        ["Postura Hi Premium Polvo Harinado 40kg (B014)", 12, 96.00, "Agrícola - Aves"],
                        ["Conejo Plus Hi-T Crecimiento Pellet 40kg (B015)", 9, 92.00, "Agrícola - Mamíferos"],
                        ["Conejo Plus Hi-R Reproductora Pellet 40kg (B016)", 2, 95.00, "Agrícola - Mamíferos"],
                        ["Cuy Plus Hi-E Crecimiento Pellet 40kg (B017)", 15, 95.00, "Agrícola - Mamíferos"],
                        ["Cuy Plus Hi-R Reproductora Pellet 40kg (B018)", 4, 90.00, "Agrícola - Mamíferos"],
                        ["Cuy Hi Premium Crecimiento Polvo Harinado 40kg (B019)", 8, 86.00, "Agrícola - Mamíferos"],
                        ["Pura Casta Inicio Etts 40kg (B020)", 13, 122.00, "Agrícola - Gallos"],
                        ["Pura Casta Crecimiento Pellet 40kg (B021)", 5, 117.00, "Agrícola - Gallos"],
                        ["Pura Casta Acabado Pellet 40kg (B022)", 16, 112.00, "Agrícola - Gallos"],
                        ["Pura Casta Muda Pellet 40kg (B023)", 3, 123.00, "Agrícola - Gallos"],
                        ["Cerdos Eco Pig 1 Micro Pellet 25kg (B024)", 6, 145.00, "Agrícola - Cerdos"],
                        ["Cerdos Eco Pig 2 Micro Pellet 25kg (B025)", 10, 127.00, "Agrícola - Cerdos"],
                        ["Cerdos Eco Pig 3 Micro Pellet 25kg (B026)", 4, 109.00, "Agrícola - Cerdos"],
                        ["Cerdos Gestación Hi Pig Harinado Polvo 40kg (B027)", 12, 76.00, "Agrícola - Cerdos"],
                        ["Cerdos Lactancia Hi Pig Harinado Polvo 40kg (B028)", 7, 99.00, "Agrícola - Cerdos"],
                        ["Cerdos Inicio 7+ Hi Pig Polvo Harinado 40kg (B029)", 2, 127.00, "Agrícola - Cerdos"],
                        ["Cerdos Inicio 12+ Hi Pig Polvo Harinado 40kg (B030)", 9, 109.00, "Agrícola - Cerdos"],
                        ["Cerdos Eco Pig 2 Polvo Harinado 40kg (B031)", 5, 176.00, "Agrícola - Cerdos"],
                        ["Cerdos Eco Pig 3 Polvo Harinado 40kg (B032)", 8, 149.00, "Agrícola - Cerdos"],
                        ["Cerdos Crecimiento Hi Pig (1) Harinado Polvo 40kg (B033)", 11, 96.00, "Agrícola - Cerdos"],
                        ["Cerdos Crecimiento Hi Pig (2) Harinado Polvo 40kg (B034)", 14, 90.00, "Agrícola - Cerdos"],
                        ["Cerdos Engorde Hi Pig Polvo Harinado 40kg (B035)", 3, 94.00, "Agrícola - Cerdos"],
                        ["Pavo Hi Premium Inicio Etts 40kg (B036)", 6, 133.00, "Agrícola - Pavos"],
                        ["Pavo Hi Premium Crecimiento Pellet 40kg (B037)", 4, 116.00, "Agrícola - Pavos"],
                        ["Pavo Hi Premium Acabado Pellet 40kg (B038)", 10, 113.00, "Agrícola - Pavos"],
                        ["Mercado Crecimiento Pellet 40kg (C001)", 18, 60.00, "Agrícola - Comercial"],
                        ["Mercado Engorde Pellet 40kg (C002)", 22, 60.00, "Agrícola - Comercial"],
                        ["Carne Crecimiento Pellet 40kg (C003)", 5, 70.00, "Agrícola - Comercial"],
                        ["Carne Engorde Pellet 40kg (C004)", 11, 70.00, "Agrícola - Comercial"],
                        ["Concentrado Mercado Carne Harinado 40kg (C005)", 14, 65.00, "Agrícola - Comercial"],
                        ["Super Carne Inicio Etts 40kg (C006)", 2, 101.00, "Agrícola - Comercial"],
                        ["Super Carne Crecimiento Pellet 40kg (C007)", 9, 101.00, "Agrícola - Comercial"],
                        ["Super Carne Engorde Pellet 40kg (C008)", 7, 101.00, "Agrícola - Comercial"],
                        ["Cuy Carne Pellet 40kg (C009)", 3, 78.00, "Agrícola - Comercial"],
                        ["Cuy Carne Polvo Harinado 40kg (C010)", 12, 73.00, "Agrícola - Comercial"],
                        ["Conejo Carne Pellet 40kg (C011)", 6, 80.00, "Agrícola - Comercial"]
                    ];

                    // Duplicamos los valores en el mapeo para rellenar tanto los campos nuevos como viejos
                    const datosHibridos = listaAgropets.map(p => [
                        p[0], // nombre
                        p[1], // cantidad
                        p[1], // stock (duplicado)
                        p[2], // precio
                        p[2], // precio_venta (duplicado)
                        p[3]  // categoria
                    ]);

                    const queryInsertarPlural = 'INSERT INTO productos (nombre, cantidad, stock, precio, precio_venta, categoria) VALUES ?';
                    const queryInsertarSingular = 'INSERT INTO producto (nombre, cantidad, stock, precio, precio_venta, categoria) VALUES ?';

                    // Insertamos en la tabla plural
                    db.query(queryInsertarPlural, [datosHibridos], (errInsert1) => {
                        if (errInsert1) return res.status(500).send("Error insertando en productos: " + errInsert1.message);

                        // Insertamos en la tabla singular
                        db.query(queryInsertarSingular, [datosHibridos], (errInsert2) => {
                            if (errInsert2) return res.status(500).send("Error insertando en producto: " + errInsert2.message);

                            res.send(`<h1>🎉 ¡Base de datos BLINDADA con éxito!</h1><p>Se reestructuraron las tablas 'productos' y 'producto' con todas las combinaciones de columnas posibles.</p>`);
                        });
                    });
                });
            });
        });
    });
});

// Definimos el puerto dinámico de Render o el 3000 para local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});