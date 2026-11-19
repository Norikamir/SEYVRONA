const isMobile = () => window.innerWidth <= 1100;

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");
const dropdowns = document.querySelectorAll(".dropdown");


// 1. ================================
//      --  Open--close---Burger--menu
//    ================================

function setMenuOpen(open) {
    if (!menuToggle || !navLinks) return;
    menuToggle.classList.toggle("active", open);
    navLinks.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
}

function closeDropdowns() {
    dropdowns.forEach(drop => setDropdownOpen(drop, false));
}

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        setMenuOpen(!navLinks.classList.contains("open"));
    });

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", (e) => {
            // Если у ссылки есть подменю (Solutions), не закрываем бургер
            if (link.parentElement.classList.contains("dropdown")) {
                return;
            }
            setMenuOpen(false);
        });
    });
}

// 2. Логика Dropdown (Solutions и др.)

function setDropdownOpen(dropdown, open) {
    const link = dropdown.querySelector("a");
    const menu = dropdown.querySelector(".dropdown-menu");
    dropdown.classList.toggle("active", open);
    if (menu) menu.classList.toggle("active", open);
    if (link) link.setAttribute("aria-expanded", open ? "true" : "false");
}

dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector("a");
    const menu = dropdown.querySelector(".dropdown-menu");

    if (link && menu) link.setAttribute("aria-expanded", "false");

    let hideTimeout;

    // Desktop hover
    dropdown.addEventListener("mouseenter", () => {
        if (isMobile()) return;
        clearTimeout(hideTimeout);
        setDropdownOpen(dropdown, true);
    });

    dropdown.addEventListener("mouseleave", () => {
        if (isMobile()) return;
        if (dropdown.contains(document.activeElement)) return; // keyboard user is inside
        hideTimeout = setTimeout(() => setDropdownOpen(dropdown, false), 150);
    });

    // Desktop keyboard: the submenu opens while focus is inside it
    dropdown.addEventListener("focusin", () => {
        if (isMobile()) return;
        clearTimeout(hideTimeout);
        setDropdownOpen(dropdown, true);
    });

    dropdown.addEventListener("focusout", (e) => {
        if (isMobile()) return;
        if (e.relatedTarget && dropdown.contains(e.relatedTarget)) return;
        setDropdownOpen(dropdown, false);
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
                setDropdownOpen(dropdown, false);
                return;
            }

            // Закрываем другие открытые подменю на мобайле
            dropdowns.forEach(other => {
                if (other !== dropdown) setDropdownOpen(other, false);
            });

            // Открываем текущее
            setDropdownOpen(dropdown, true);
        });
    }
});

// Закрытие меню при клике вне его области

document.addEventListener("click", (e) => {
    if (isMobile() && navLinks && navLinks.classList.contains("open")) {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            setMenuOpen(false);

            // Сбрасываем дропдауны заодно, иначе состояние "зависает"
            closeDropdowns();
        }
    }
});

// Escape closes the submenu / the mobile menu and returns focus
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openDrop = [...dropdowns].find(d => d.classList.contains("active"));
    if (openDrop) {
        setDropdownOpen(openDrop, false);
        if (openDrop.contains(document.activeElement)) openDrop.querySelector("a").focus();
        return;
    }
    if (menuToggle && navLinks && navLinks.classList.contains("open")) {
        setMenuOpen(false);
        menuToggle.focus();
    }
});
