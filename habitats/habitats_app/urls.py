from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),          # /
    path("utah/", views.utah, name="utah"),       # /utah/
    path("hawaii/", views.hawaii, name="hawaii"), # /hawaii/
    path("polonia/", views.polonia, name="polonia"), # /polonia/
]
