// MI VISUAL - control definitivo de menú por perfil
console.log("APP.JS CARGADO - MENU PERFILES FIX 14 DEFINITIVO");

const MENU_PERFILES = {
  TECNICO: [
    "cardProduccion",
    "cardEfectividad",
    "cardRecableado",
    "cardVTRGAR",
    "cardRanking",
    "cardObservaciones",
    "cardAccesos",
    "cardBiblioteca",
    "cardCapacitacion"
  ],

  SUPERVISOR: [
    "cardRanking",
    "cardObservaciones",
    "cardAccesos",
    "cardBiblioteca",
    "cardCapacitacion",
    "cardDashboardSupervisor"
  ],

  JEFATURA: [
    "cardProduccion",
    "cardEfectividad",
    "cardRecableado",
    "cardVTRGAR",
    "cardRanking",
    "cardObservaciones",
    "cardAccesos",
    "cardBiblioteca",
    "cardCapacitacion",
    "cardDashboardJefatura",
    "cardAdministracion"
  ],

  ADMIN: [
    "cardProduccion",
    "cardEfectividad",
    "cardRecableado",
    "cardVTRGAR",
    "cardRanking",
    "cardObservaciones",
    "cardAccesos",
    "cardBiblioteca",
    "cardCapacitacion",
    "cardDashboardJefatura",
    "cardAdministracion"
  ],

  ADMINISTRADOR: [
    "cardProduccion",
    "cardEfectividad",
    "cardRecableado",
    "cardVTRGAR",
    "cardRanking",
    "cardObservaciones",
    "cardAccesos",
    "cardBiblioteca",
    "cardCapacitacion",
    "cardDashboardJefatura",
    "cardAdministracion"
  ]
};

function volverInicio(){
  limpiarPantalla();
  configurarMenu();
  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 300);
}

function normalizarPerfilMenu(valor){
  return (valor || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerPerfilActualMenu(){
  return normalizarPerfilMenu(localStorage.getItem("perfil"));
}

function ocultarTodoMenu(){
  document.querySelectorAll("#menuPrincipal .card").forEach(card => {
    card.classList.remove("menu-visible");
    card.style.setProperty("display", "none", "important");
  });
}

function mostrarOpcionesMenu(ids){
  ids.forEach(id => {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.add("menu-visible");
    card.style.setProperty("display", "flex", "important");
  });
}

function configurarMenu(){
  console.log("CONFIGURAR MENU - FIX 14 DEFINITIVO");

  const perfil = obtenerPerfilActualMenu();
  console.log("PERFIL DETECTADO:", perfil);

  const menu = document.getElementById("menuPrincipal");
  const pantalla = document.getElementById("pantalla");
  const resultado = document.getElementById("resultadoProduccion");

  if (pantalla) pantalla.innerHTML = "";
  if (resultado) resultado.innerHTML = "";

  ocultarTodoMenu();

  if (menu) {
    menu.style.setProperty("display", "grid", "important");
  }

  const opciones = MENU_PERFILES[perfil] || [];
  mostrarOpcionesMenu(opciones);

  if (!opciones.length) {
    console.warn("Perfil sin permisos configurados:", perfil);
  }
}

window.configurarMenu = configurarMenu;
window.volverInicio = volverInicio;

window.addEventListener("load", function(){
  setTimeout(function(){
    const carga = document.getElementById("pantallaCarga");
    const app = document.getElementById("contenidoApp");
    if (carga) carga.style.display = "none";
    if (app) app.style.display = "block";

    const perfil = obtenerPerfilActualMenu();
    if (perfil) configurarMenu();
  }, 1200);
});
