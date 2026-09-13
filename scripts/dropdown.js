const isMobile = () => window.innerWidth <= 1100;

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");
const dropdowns = document.querySelectorAll(".dropdown");


// 1. ================================
//      --  Open--close---Burger--menu
//    ================================

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        menuToggle.classList.toggle("active");
        navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", (e) => {
            // Если у ссылки есть подменю (Solutions), не закрываем бургер
            if (link.parentElement.classList.contains("dropdown")) {
                return;
            }
            menuToggle.classList.remove("active");
            navLinks.classList.remove("open");
        });
    });
}

// 2. Логика Dropdown (Solutions и др.)

dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector("a");
    const menu = dropdown.querySelector(".dropdown-menu");

    let hideTimeout;

    // Desktop hover
    dropdown.addEventListener("mouseenter", () => {
        if (isMobile()) return;
        clearTimeout(hideTimeout);
        if (menu) menu.classList.add("active");
        dropdown.classList.add("active");
    });

    dropdown.addEventListener("mouseleave", () => {
        if (isMobile()) return;
        hideTimeout = setTimeout(() => {
            if (menu) menu.classList.remove("active");
            dropdown.classList.remove("active");
        }, 150);
    });

    // Mobile click (раскрытие по клику на Solutions)

    if (link && menu) {
        
        link.addEventListener("click", (e) => {
            if (!isMobile()) return;

            e.preventDefault(); // Отменяем переход по ссылке родителя
            e.stopPropagation();

            const isOpen = dropdown.classList.contains("active");

            if (isOpen) {
                // Уже открыто — закрываем обратно
                dropdown.classList.remove("active");
                menu.classList.remove("active");
                return;
            }

            // Закрываем другие открытые подменю на мобайле
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove("active");
                    const otherMenu = other.querySelector(".dropdown-menu");
                    if (otherMenu) otherMenu.classList.remove("active");
                }
            });

            // Открываем текущее
            dropdown.classList.add("active");
            menu.classList.add("active");
        });
    }
});

// Закрытие меню при клике вне его области

document.addEventListener("click", (e) => {
    if (isMobile() && navLinks && navLinks.classList.contains("open")) {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            menuToggle.classList.remove("active");
            navLinks.classList.remove("open");

            // Сбрасываем дропдауны заодно, иначе состояние "зависает"
            dropdowns.forEach(drop => {
                drop.classList.remove("active");
                const m = drop.querySelector(".dropdown-menu");
                if (m) m.classList.remove("active");
            });
        }
    }
});