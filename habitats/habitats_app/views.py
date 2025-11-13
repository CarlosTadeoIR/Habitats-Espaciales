from django.shortcuts import render

def index(request):
    # Página principal con propósito, créditos y enlaces a hábitats
    return render(request, "index.html")

def utah(request):
    # Página donde se muestra el modelo 3D de Utah
    return render(request, "utah.html")

def hawaii(request):
    # De momento puede estar vacía o con un texto
    return render(request, "hawaii.html")

def polonia(request):
    # Igual que Hawaii por ahora
    return render(request, "polonia.html")
