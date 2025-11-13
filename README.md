# 🛰️ Proyecto Hábitats Espaciales

## 📘 Descripción del proyecto
Este proyecto es una página web interactiva desarrollada con **Django (Python)** que permite explorar distintos **hábitats espaciales en 3D** mediante Three.js.
Los modelos 3D representan bases experimentales inspiradas en ambientes extremos:

- Hábitat de Utah  
- Hábitat de Polonia  
- Hábitat de Hawaii  

Cada hábitat incluye un recorrido virtual con navegación interactiva.

---

## 🧩 Tecnologías utilizadas
- Django 5.x  
- Python 3.11+  
- Three.js  
- GLTFLoader + DRACOLoader  
- HTML5 / CSS3 / ES Modules  

---

## 📦 Requisitos previos
- Python 3.10+  
- pip  
- virtualenv (opcional pero recomendado)

---

## ⚙️ Instalación

### 1️⃣ Crear entorno virtual (opcional)
**Windows**
```
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac**
```
python3 -m venv venv
source venv/bin/activate
```

### 2️⃣ Instalar dependencias
```
pip install django
```

### 3️⃣ Ejecutar el servidor
```
python manage.py runserver
```

Abrir en navegador:
```
http://127.0.0.1:8000/
```

---

## 📁 Estructura del proyecto
```
habitats/
│ manage.py
│
├── habitats/               # Configuración de Django
├── habitats_app/           # Aplicación principal
│   ├── templates/          # HTML (index, utah, polonia, hawaii)
│   ├── static/             # Archivos estáticos
│   │   ├── home/
│   │   └── utah/
│   │       ├── app.js
│   │       ├── core/
│   │       ├── utils/
│   │       └── gltfmodel/
│   │           ├── SampleScene.glb
│   │           └── SampleScene.bin (si existe)
│   └── views.py
```

---

## 🛸 Modelos 3D
Los modelos se encuentran en:
```
habitats_app/static/utah/gltfmodel/
```

La primera carga puede tardar dependiendo del tamaño del archivo GLB.

---

## 🧱 Notas finales
- El diseño está preparado para agregar más hábitats fácilmente.  

