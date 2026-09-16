/* =========================================================
   SHELTY COUTURE - ADMIN DASHBOARD
   Complete admin controller
   ========================================================= */


/* =========================================================
   ADMIN SESSION
   ========================================================= */

let token = localStorage.getItem("sheltyAdminToken");

const $ = s => document.querySelector(s);


/* =========================================================
   API HELPER
   ========================================================= */

const api = async (url, opts = {}) => {

  const isLogin = url === "/api/admin/login";

  opts.headers = {
    ...(opts.headers || {}),
    ...(!isLogin && token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {})
  };

  let res;

  try {

    res = await fetch(url, opts);

  } catch (err) {

    throw new Error(
      "Unable to connect to the server. Please check your internet connection."
    );

  }


  /* -------------------------------------------------------
     AUTHENTICATION
     ------------------------------------------------------- */

  if (res.status === 401) {

    if (!isLogin) {

      logout();

      throw new Error(
        "Your admin session has expired. Please sign in again."
      );

    }

    throw new Error(
      "Invalid admin email or password."
    );

  }


  /* -------------------------------------------------------
     READ RESPONSE
     ------------------------------------------------------- */

  const contentType =
    res.headers.get("content-type") || "";

  const raw =
    await res.text();

  let data = null;


  /* -------------------------------------------------------
     JSON RESPONSE
     ------------------------------------------------------- */

  if (
    contentType.includes(
      "application/json"
    )
  ) {

    try {

      data =
        raw
          ? JSON.parse(raw)
          : null;

    } catch (err) {

      throw new Error(
        "The server returned invalid JSON."
      );

    }

  }


  /* -------------------------------------------------------
     NON JSON RESPONSE
     ------------------------------------------------------- */

  else {

    const message =
      raw
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();


    if (!res.ok) {

      throw new Error(
        message ||
        `Request failed (${res.status})`
      );

    }


    throw new Error(
      "The admin API returned an HTML page instead of JSON. Check the server route."
    );

  }


  /* -------------------------------------------------------
     API ERROR
     ------------------------------------------------------- */

  if (!res.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      "Request failed."
    );

  }


  return data;

};


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  localStorage.removeItem(
    "sheltyAdminToken"
  );

  token = null;


  const appView =
    $("#app-view");

  const loginView =
    $("#login-view");


  if (appView) {

    appView.classList.add(
      "hidden"
    );

  }


  if (loginView) {

    loginView.classList.remove(
      "hidden"
    );

  }


  const error =
    $("#login-error");


  if (error) {

    error.textContent = "";

  }

}


/* =========================================================
   SHOW ADMIN APPLICATION
   ========================================================= */

function showApp() {

  const loginView =
    $("#login-view");

  const appView =
    $("#app-view");


  if (loginView) {

    loginView.classList.add(
      "hidden"
    );

  }


  if (appView) {

    appView.classList.remove(
      "hidden"
    );

  }


  loadView("dashboard")
    .catch(err => {

      console.error(
        "Dashboard loading error:",
        err
      );


      if ($("#content")) {

        $("#content").innerHTML = `

          <div class="panel">

            <h2>
              Unable to load dashboard
            </h2>

            <p>
              ${esc(err.message)}
            </p>

            <button
              type="button"
              onclick="location.reload()"
            >
              Refresh
            </button>

          </div>

        `;

      }

    });

}


/* =========================================================
   LOGIN
   ========================================================= */

const loginForm =
  $("#login-form");


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const form =
        e.target;


      const emailInput =
        form.elements.email;


      const passwordInput =
        form.elements.password;


      const loginError =
        $("#login-error");


      if (loginError) {

        loginError.textContent = "";

      }


      /* ---------------------------------------------------
         REMOVE OLD SESSION
         --------------------------------------------------- */

      token = null;

      localStorage.removeItem(
        "sheltyAdminToken"
      );


      const email =
        String(
          emailInput?.value || ""
        ).trim();


      const password =
        String(
          passwordInput?.value || ""
        );


      if (!email || !password) {

        if (loginError) {

          loginError.textContent =
            "Please enter your email and password.";

        }

        return;

      }


      const button =
        form.querySelector(
          "button"
        );


      if (button) {

        button.disabled = true;

        button.textContent =
          "Signing in...";

      }


      try {

        const d =
          await api(
            "/api/admin/login",
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify({

                  email,

                  password

                })

            }
          );


        if (
          !d ||
          !d.token
        ) {

          throw new Error(
            "Login succeeded but no session token was returned."
          );

        }


        token =
          d.token;


        localStorage.setItem(
          "sheltyAdminToken",
          token
        );


        if (loginError) {

          loginError.textContent = "";

        }


        showApp();

      }


      catch (err) {

        console.error(
          "Admin login error:",
          err
        );


        if (loginError) {

          loginError.textContent =
            err.message ||
            "Unable to sign in.";

        }

      }


      finally {

        if (button) {

          button.disabled = false;

          button.textContent =
            "Sign in";

        }

      }

    }
  );

}


/* =========================================================
   LOGOUT BUTTON
   ========================================================= */

const logoutButton =
  $("#logout");


if (logoutButton) {

  logoutButton.onclick =
    logout;

}


/* =========================================================
   SIDEBAR NAVIGATION
   ========================================================= */

document
  .querySelectorAll(
    "[data-view]"
  )
  .forEach(button => {

    button.onclick = () => {

      loadView(
        button.dataset.view
      )
      .catch(err => {

        console.error(err);


        if ($("#content")) {

          $("#content").innerHTML = `

            <div class="panel">

              <h2>
                Something went wrong
              </h2>

              <p>
                ${esc(err.message)}
              </p>

            </div>

          `;

        }

      });

    };

  });


/* =========================================================
   VIEW LOADER
   ========================================================= */

async function loadView(view) {

  const titles = {

    dashboard:
      "Dashboard",

    products:
      "Products",

    orders:
      "Orders",

    appointments:
      "Appointments",

    tailoring:
      "Custom Requests",

    students:
      "Student Applications"

  };


  if ($("#view-title")) {

    $("#view-title").textContent =
      titles[view] ||
      "Dashboard";

  }


  window.currentView =
    view;


  if (
    view === "dashboard"
  ) {

    return dashboard();

  }


  if (
    view === "products"
  ) {

    return products();

  }


  if (
    view === "orders"
  ) {

    return orders();

  }


  if (
    view === "appointments"
  ) {

    return appointments();

  }


  if (
    view === "tailoring"
  ) {

    return tailoring();

  }


  if (
    view === "students"
  ) {

    return students();

  }

}


/* =========================================================
   HELPERS
   ========================================================= */

function money(n) {

  return `GHS ${Number(
    n || 0
  ).toLocaleString()}`;

}


function esc(v = "") {

  return String(v).replace(
    /[&<>"']/g,
    x => ({

      "&":
        "&amp;",

      "<":
        "&lt;",

      ">":
        "&gt;",

      '"':
        "&quot;",

      "'":
        "&#039;"

    }[x])

  );

}


/* =========================================================
   FILE SIZE HELPER
   ========================================================= */

function formatFileSize(bytes) {

  if (!bytes) {

    return "0 KB";

  }


  if (
    bytes <
    1024 * 1024
  ) {

    return (
      (bytes / 1024)
        .toFixed(1)
      + " KB"
    );

  }


  return (
    (bytes /
      (1024 * 1024))
      .toFixed(1)
    + " MB"
  );

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard() {

  const d =
    await api(
      "/api/admin/summary"
    );


  $("#content").innerHTML = `

    <div class="stats">

      <div class="stat">

        <b>
          ${d.products}
        </b>

        <span>
          Active products
        </span>

      </div>


      <div class="stat">

        <b>
          ${d.orders}
        </b>

        <span>
          Total orders
        </span>

      </div>


      <div class="stat">

        <b>
          ${d.pendingAppointments}
        </b>

        <span>
          Pending appointments
        </span>

      </div>


      <div class="stat">

        <b>
          ${d.studentApplications}
        </b>

        <span>
          Student applications
        </span>

      </div>


      <div class="stat">

        <b>
          ${money(d.revenue)}
        </b>

        <span>
          Paid revenue
        </span>

      </div>

    </div>


    <div class="panel">

      <h2>
        Atelier overview
      </h2>

      <p>

        You have

        <strong>
          ${d.tailoringRequests}
        </strong>

        new custom design requests.

        Use the menu to manage products,
        orders, appointments and enquiries.

      </p>

    </div>

  `;

}


/* =========================================================
   PRODUCT IMAGE UPLOAD
   ========================================================= */

/*
   Maximum image size on the admin side.

   The server must also allow this size.
*/

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;


/*
   Allowed image formats.
*/

const ALLOWED_IMAGE_TYPES = [

  "image/jpeg",

  "image/png",

  "image/webp",

  "image/gif"

];


async function uploadProductImage(file) {

  if (!file) {

    return null;

  }


  /* -------------------------------------------------------
     CHECK FILE TYPE
     ------------------------------------------------------- */

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type
    )
  ) {

    throw new Error(
      "Please upload a JPG, PNG, WEBP or GIF image."
    );

  }


  /* -------------------------------------------------------
     CHECK FILE SIZE
     ------------------------------------------------------- */

  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {

    throw new Error(
      `Image is too large. Maximum allowed size is 10MB. Your image is ${formatFileSize(file.size)}.`
    );

  }


  const form =
    new FormData();


  form.append(
    "image",
    file
  );


  let res;


  try {

    res =
      await fetch(
        "/api/admin/upload-image",
        {

          method: "POST",

          headers:
            token
              ? {
                  Authorization:
                    `Bearer ${token}`
                }
              : {},

          body:
            form

        }
      );

  }


  catch (err) {

    throw new Error(
      "Unable to connect while uploading the image."
    );

  }


  /* -------------------------------------------------------
     PAYLOAD TOO LARGE
     ------------------------------------------------------- */

  if (
    res.status === 413
  ) {

    throw new Error(
      "The image is too large for the server. Please use an image below 10MB."
    );

  }


  /* -------------------------------------------------------
     AUTHENTICATION
     ------------------------------------------------------- */

  if (
    res.status === 401
  ) {

    logout();


    throw new Error(
      "Your admin session has expired. Please sign in again."
    );

  }


  const contentType =
    res.headers.get(
      "content-type"
    ) || "";


  const raw =
    await res.text();


  let data = null;


  /* -------------------------------------------------------
     JSON RESPONSE
     ------------------------------------------------------- */

  if (
    contentType.includes(
      "application/json"
    )
  ) {

    try {

      data =
        raw
          ? JSON.parse(raw)
          : null;

    }


    catch (err) {

      throw new Error(
        "The image upload response was invalid."
      );

    }

  }


  /* -------------------------------------------------------
     NON JSON RESPONSE
     ------------------------------------------------------- */

  else {

    const message =
      raw
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();


    throw new Error(
      message ||
      `Image upload failed (${res.status}).`
    );

  }


  /* -------------------------------------------------------
     SERVER ERROR
     ------------------------------------------------------- */

  if (!res.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      "Image upload failed."
    );

  }


  if (!data?.image_url) {

    throw new Error(
      "Image uploaded but the server did not return an image URL."
    );

  }


  return data.image_url;

}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function products() {

  const ps =
    await api(
      "/api/admin/products"
    );


  window.__adminProducts =
    ps;


  const clothingTypes = [

    "Dresses",

    "Tops",

    "Shirts",

    "Trousers",

    "Skirts",

    "Jumpsuits",

    "Suits",

    "Kaftans",

    "Agbada",

    "Two-Piece",

    "Outerwear",

    "Accessories",

    "Other"

  ];


  /* =======================================================
     PRODUCT FORM FIELDS
     ======================================================= */

  const formFields =
    (p = {}) => `

    <label>

      Name

      <input
        name="name"
        value="${esc(
          p.name || ""
        )}"
        required
      >

    </label>


    <label>

      Category

      <select
        name="category"
      >

        ${[
          "Women",
          "Men",
          "African Wear",
          "Custom"
        ]
          .map(
            x =>
              `<option
                ${
                  p.category === x
                    ? "selected"
                    : ""
                }
              >
                ${x}
              </option>`
          )
          .join("")}

      </select>

    </label>


    <label>

      Gender

      <select
        name="gender"
      >

        ${[
          "Female",
          "Male",
          "Unisex"
        ]
          .map(
            x =>
              `<option
                ${
                  p.gender === x
                    ? "selected"
                    : ""
                }
              >
                ${x}
              </option>`
          )
          .join("")}

      </select>

    </label>


    <label>

      Product Type

      <select
        name="product_type"
      >

        ${[
          "Ready-to-Wear",
          "Customized"
        ]
          .map(
            x =>
              `<option
                ${
                  p.product_type === x
                    ? "selected"
                    : ""
                }
              >
                ${x}
              </option>`
          )
          .join("")}

      </select>

    </label>


    <label>

      Clothing Type

      <select
        name="clothing_type"
      >

        ${clothingTypes
          .map(
            x =>
              `<option
                ${
                  p.clothing_type === x
                    ? "selected"
                    : ""
                }
              >
                ${x}
              </option>`
          )
          .join("")}

      </select>

    </label>


    <label>

      Price (GHS)

      <input
        type="number"
        min="0"
        step="0.01"
        name="price"
        value="${Number(
          p.price || 0
        )}"
      >

    </label>


    <label>

      Stock

      <input
        type="number"
        min="0"
        name="stock"
        value="${Number(
          p.stock || 0
        )}"
      >

    </label>


    <label>

      Sizes

      <input
        name="sizes"
        value="${esc(
          p.sizes || ""
        )}"
        placeholder="S,M,L,XL"
      >

    </label>


    <label>

      Colors

      <input
        name="colors"
        value="${esc(
          p.colors || ""
        )}"
        placeholder="Emerald, Ivory"
      >

    </label>


    <label class="full">

      Product Image

      <input
        type="file"
        name="image_file"
        accept="image/jpeg,image/png,image/webp,image/gif"
      >


      <input
        type="hidden"
        name="image_url"
        value="${esc(
          p.image_url || ""
        )}"
      >


      <small class="small-note">

        Choose an image from your computer.

        Maximum 10MB.

        JPG, PNG, WEBP or GIF.

      </small>

    </label>


    <label class="full">

      Description

      <textarea
        name="description"
        rows="3"
      >${esc(
        p.description || ""
      )}</textarea>

    </label>


    <label class="check">

      <input
        type="checkbox"
        name="featured"
        ${
          p.featured
            ? "checked"
            : ""
        }
      >

      Featured

    </label>


    <label class="check">

      <input
        type="checkbox"
        name="active"
        ${
          p.active !== false
            ? "checked"
            : ""
        }
      >

      Active / visible on website

    </label>

  `;


  /* =======================================================
     PRODUCT PAGE
     ======================================================= */

  $("#content").innerHTML = `

    <div class="panel">

      <h2>
        Add a product
      </h2>


      <p class="small-note">

        Choose the customer-facing classifications
        from simple dropdowns.

        Every product added here will appear
        in the catalogue automatically
        when it is Active.

      </p>


      <form
        id="product-form"
        class="product-form"
      >

        ${formFields()}


        <button
          class="full"
          type="submit"
        >
          Add product
        </button>

      </form>

    </div>


    <div class="panel">

      <h2>
        Catalogue
      </h2>


      <table class="data-table">

        <thead>

          <tr>

            <th>
              Product
            </th>

            <th>
              Classification
            </th>

            <th>
              Price
            </th>

            <th>
              Stock
            </th>

            <th>
              Visibility
            </th>

            <th>
              Actions
            </th>

          </tr>

        </thead>


        <tbody>

          ${
            ps.length

              ? ps
                  .map(
                    p => `

                <tr>

                  <td>

                    <div
                      class="catalogue-product"
                    >

                      <img
                        src="${esc(
                          p.image_url ||
                          "/assets/shelty-logo.png"
                        )}"
                        alt="${esc(
                          p.name || "Product"
                        )}"
                      >


                      <div>

                        <strong>
                          ${esc(
                            p.name
                          )}
                        </strong>


                        <br>


                        <small>

                          ${esc(
                            p.description ||
                            ""
                          ).slice(
                            0,
                            80
                          )}

                        </small>

                      </div>

                    </div>

                  </td>


                  <td>

                    ${esc(
                      p.gender ||
                      "Unisex"
                    )}

                    ·

                    ${esc(
                      p.product_type ||
                      "Ready-to-Wear"
                    )}


                    <br>


                    <small>

                      ${esc(
                        p.category ||
                        ""
                      )}

                      ·

                      ${esc(
                        p.clothing_type ||
                        "Other"
                      )}

                    </small>

                  </td>


                  <td>

                    ${
                      p.price
                        ? money(
                            p.price
                          )
                        : "On request"
                    }

                  </td>


                  <td>

                    ${Number(
                      p.stock || 0
                    )}

                  </td>


                  <td>

                    <span class="pill">

                      ${
                        p.active
                          ? "Active"
                          : "Hidden"
                      }

                    </span>

                  </td>


                  <td>

                    <div
                      class="actions"
                    >

                      <button
                        type="button"
                        class="action primary"
                        onclick="editProduct(${p.id})"
                      >
                        Edit
                      </button>


                      <button
                        type="button"
                        class="action danger"
                        onclick="deleteProduct(${p.id})"
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              `
                  )
                  .join("")

              : `

                <tr>

                  <td
                    colspan="6"
                  >

                    No products found.

                  </td>

                </tr>

              `
          }

        </tbody>

      </table>

    </div>


    <!-- ===================================================
         EDIT PRODUCT MODAL
         =================================================== -->

    <div
      id="edit-product-modal"
      class="edit-modal hidden"
    >

      <div
        class="edit-card"
      >

        <div
          class="edit-card-header"
        >

          <h2>
            Edit product
          </h2>


          <button
            type="button"
            class="modal-close"
            onclick="closeEditProduct()"
          >
            ×
          </button>

        </div>


        <form
          id="edit-product-form"
          class="product-form"
        >

          <input
            type="hidden"
            name="id"
          >


          ${formFields()}


          <button
            class="full"
            type="submit"
          >
            Save changes
          </button>

        </form>

      </div>

    </div>

  `;


  /* =======================================================
     ADD PRODUCT
     ======================================================= */

  $("#product-form").onsubmit =
    async e => {

      e.preventDefault();


      const form =
        e.target;


      const button =
        form.querySelector(
          "button[type='submit']"
        );


      const originalText =
        button?.textContent ||
        "Add product";


      const o =
        Object.fromEntries(
          new FormData(
            form
          ).entries()
        );


      o.featured =
        form.featured.checked;


      o.active =
        form.active.checked;


      o.price =
        Number(
          o.price || 0
        );


      o.stock =
        Number(
          o.stock || 0
        );


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Adding product...";

      }


      try {

        const file =
          form.image_file?.files?.[0];


        /*
          Upload image first.
        */

        const uploaded =
          await uploadProductImage(
            file
          );


        if (uploaded) {

          o.image_url =
            uploaded;

        }


        /*
          File itself must not be sent
          to the JSON product endpoint.
        */

        delete o.image_file;


        await api(
          "/api/admin/products",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(o)

          }
        );


        alert(
          "Product added successfully."
        );


        await products();

      }


      catch (err) {

        console.error(
          "Add product error:",
          err
        );


        alert(
          err.message
        );

      }


      finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            originalText;

        }

      }

    };


  /* =======================================================
     EDIT PRODUCT
     ======================================================= */

  $("#edit-product-form").onsubmit =
    async e => {

      e.preventDefault();


      const form =
        e.target;


      const o =
        Object.fromEntries(
          new FormData(
            form
          ).entries()
        );


      const id =
        o.id;


      delete o.id;


      o.featured =
        form.featured.checked;


      o.active =
        form.active.checked;


      o.price =
        Number(
          o.price || 0
        );


      o.stock =
        Number(
          o.stock || 0
        );


      const button =
        form.querySelector(
          "button[type='submit']"
        );


      const originalText =
        button?.textContent ||
        "Save changes";


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Saving...";

      }


      try {

        const file =
          form.image_file?.files?.[0];


        /*
          Only upload an image if
          the administrator selected
          a new image.
        */

        const uploaded =
          await uploadProductImage(
            file
          );


        if (uploaded) {

          o.image_url =
            uploaded;

        }


        delete o.image_file;


        await api(
          "/api/admin/products/" +
          id,
          {

            method: "PUT",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(o)

          }
        );


        alert(
          "Product updated successfully."
        );


        await products();

      }


      catch (err) {

        console.error(
          "Update product error:",
          err
        );


        alert(
          err.message
        );

      }


      finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            originalText;

        }

      }

    };

}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

window.editProduct =
  id => {

    const row =
      window.__adminProducts?.find(
        p =>
          p.id === id
      );


    if (row) {

      return fillEditProduct(
        row
      );

    }


    api(
      "/api/admin/products"
    )

      .then(ps => {

        window.__adminProducts =
          ps;


        const p =
          ps.find(
            x =>
              x.id === id
          );


        if (p) {

          fillEditProduct(
            p
          );

        }

      })


      .catch(err => {

        alert(
          err.message
        );

      });

  };


/* =========================================================
   FILL EDIT FORM
   ========================================================= */

function fillEditProduct(p) {

  const modal =
    $("#edit-product-modal");


  const form =
    $("#edit-product-form");


  if (!modal || !form) {

    return;

  }


  form.id.value =
    p.id;


  [

    "name",

    "category",

    "gender",

    "product_type",

    "clothing_type",

    "price",

    "stock",

    "sizes",

    "colors",

    "image_url",

    "description"

  ].forEach(k => {

    if (
      form.elements[k]
    ) {

      form.elements[k].value =
        p[k] ?? "";

    }

  });


  form.featured.checked =
    !!p.featured;


  form.active.checked =
    p.active !== false;


  modal.classList.remove(
    "hidden"
  );

}


/* =========================================================
   CLOSE EDIT MODAL
   ========================================================= */

window.closeEditProduct =
  () => {

    $("#edit-product-modal")
      ?.classList.add(
        "hidden"
      );

  };


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

window.deleteProduct =
  async id => {

    const ps =
      window.__adminProducts ||
      await api(
        "/api/admin/products"
      );


    const p =
      ps.find(
        x =>
          x.id === id
      );


    if (!p) {

      return;

    }


    if (
      !confirm(
        `Delete "${p.name}" permanently? This cannot be undone.`
      )
    ) {

      return;

    }


    try {

      await api(
        "/api/admin/products/" +
        id,
        {

          method:
            "DELETE"

        }
      );


      alert(
        "Product deleted successfully."
      );


      await products();

    }


    catch (err) {

      alert(
        err.message
      );

    }

  };


/* =========================================================
   ORDERS
   ========================================================= */

async function orders() {

  const os =
    await api(
      "/api/admin/orders"
    );


  $("#content").innerHTML = `

    <div class="panel">

      <h2>
        Orders
      </h2>


      <table
        class="data-table"
      >

        <thead>

          <tr>

            <th>
              Reference
            </th>

            <th>
              Customer
            </th>

            <th>
              Items
            </th>

            <th>
              Amount
            </th>

            <th>
              Payment
            </th>

            <th>
              Order status
            </th>

          </tr>

        </thead>


        <tbody>

          ${
            os
              .map(
                o => `

              <tr>

                <td>

                  <strong>
                    ${esc(
                      o.reference
                    )}
                  </strong>


                  <br>


                  <small>

                    ${new Date(
                      o.created_at
                    ).toLocaleString()}

                  </small>

                </td>


                <td>

                  ${esc(
                    o.customer_name
                  )}

                  <br>

                  ${esc(
                    o.phone
                  )}

                  <br>

                  ${esc(
                    o.email
                  )}

                </td>


                <td>

                  ${(o.items || [])
                    .map(
                      i =>
                        esc(
                          i.name
                        ) +
                        " × " +
                        i.quantity
                    )
                    .join(
                      "<br>"
                    )}

                </td>


                <td>

                  ${money(
                    o.amount
                  )}

                </td>


                <td>

                  <span
                    class="pill"
                  >

                    ${esc(
                      o.payment_status
                    )}

                  </span>

                </td>


                <td>

                  <select
                    onchange="setOrderStatus(${o.id},this.value)"
                  >

                    ${[
                      "pending",
                      "processing",
                      "ready",
                      "completed",
                      "cancelled"

                    ]
                      .map(
                        s =>
                          `<option
                            ${
                              o.order_status === s
                                ? "selected"
                                : ""
                            }
                          >
                            ${s}
                          </option>`
                      )
                      .join("")}

                  </select>

                </td>

              </tr>

            `
              )
              .join("")

          }

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   ORDER STATUS
   ========================================================= */

window.setOrderStatus =
  async (
    id,
    status
  ) => {

    try {

      await api(
        "/api/admin/orders/" +
        id +
        "/status",
        {

          method:
            "PUT",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({
              status
            })

        }
      );

    }


    catch (err) {

      alert(
        err.message
      );

    }

  };


/* =========================================================
   APPOINTMENTS
   ========================================================= */

async function appointments() {

  const a =
    await api(
      "/api/admin/appointments"
    );


  $("#content").innerHTML = `

    <div class="panel">

      <h2>
        Appointments
      </h2>


      <table
        class="data-table"
      >

        <thead>

          <tr>

            <th>
              Date
            </th>

            <th>
              Client
            </th>

            <th>
              Service
            </th>

            <th>
              Contact
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>

          ${
            a
              .map(
                x => `

              <tr>

                <td>

                  <strong>
                    ${esc(
                      x.appointment_date
                    )}
                  </strong>


                  <br>


                  ${esc(
                    x.appointment_time
                  )}

                </td>


                <td>

                  ${esc(
                    x.name
                  )}

                </td>


                <td>

                  ${esc(
                    x.service
                  )}


                  <br>


                  <small>

                    ${esc(
                      x.message
                    )}

                  </small>

                </td>


                <td>

                  ${esc(
                    x.phone
                  )}


                  <br>


                  ${esc(
                    x.email
                  )}

                </td>


                <td>

                  <select
                    onchange="setAppointmentStatus(${x.id},this.value)"
                  >

                    ${[
                      "pending",
                      "confirmed",
                      "completed",
                      "cancelled"

                    ]
                      .map(
                        s =>
                          `<option
                            ${
                              x.status === s
                                ? "selected"
                                : ""
                            }
                          >
                            ${s}
                          </option>`
                      )
                      .join("")}

                  </select>

                </td>

              </tr>

            `
              )
              .join("")

          }

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   APPOINTMENT STATUS
   ========================================================= */

window.setAppointmentStatus =
  async (
    id,
    status
  ) => {

    try {

      await api(
        "/api/admin/appointments/" +
        id +
        "/status",
        {

          method:
            "PUT",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({
              status
            })

        }
      );

    }


    catch (err) {

      alert(
        err.message
      );

    }

  };


/* =========================================================
   CUSTOM TAILORING REQUESTS
   ========================================================= */

async function tailoring() {

  const a =
    await api(
      "/api/admin/tailoring-requests"
    );


  $("#content").innerHTML = `

    <div class="panel">

      <h2>
        Custom Design Requests
      </h2>


      <table
        class="data-table"
      >

        <thead>

          <tr>

            <th>
              Client
            </th>

            <th>
              Garment
            </th>

            <th>
              Details
            </th>

            <th>
              Contact
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>

          ${
            a
              .map(
                x => `

              <tr>

                <td>

                  ${esc(
                    x.name
                  )}

                </td>


                <td>

                  ${esc(
                    x.garment_type
                  )}


                  <br>


                  ${esc(
                    x.occasion
                  )}

                </td>


                <td>

                  ${esc(
                    x.message
                  )}


                  <br>


                  <small>

                    Fabric:
                    ${esc(
                      x.fabric
                    )}

                    ·

                    Budget:
                    ${esc(
                      x.budget
                    )}

                  </small>

                </td>


                <td>

                  ${esc(
                    x.phone
                  )}


                  <br>


                  ${esc(
                    x.email
                  )}

                </td>


                <td>

                  <select
                    onchange="setTailoringStatus(${x.id},this.value)"
                  >

                    ${[
                      "new",
                      "reviewing",
                      "accepted",
                      "completed",
                      "declined"

                    ]
                      .map(
                        s =>
                          `<option
                            ${
                              x.status === s
                                ? "selected"
                                : ""
                            }
                          >
                            ${s}
                          </option>`
                      )
                      .join("")}

                  </select>

                </td>

              </tr>

            `
              )
              .join("")

          }

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   TAILORING STATUS
   ========================================================= */

window.setTailoringStatus =
  async (
    id,
    status
  ) => {

    try {

      await api(
        "/api/admin/tailoring-requests/" +
        id +
        "/status",
        {

          method:
            "PUT",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({
              status
            })

        }
      );

    }


    catch (err) {

      alert(
        err.message
      );

    }

  };


/* =========================================================
   STUDENT APPLICATIONS
   ========================================================= */

async function students() {

  const a =
    await api(
      "/api/admin/student-applications"
    );


  $("#content").innerHTML = `

    <div class="panel">

      <h2>
        Student Applications
      </h2>


      <table
        class="data-table"
      >

        <thead>

          <tr>

            <th>
              Applicant
            </th>

            <th>
              Training
            </th>

            <th>
              Programme
            </th>

            <th>
              Contact
            </th>

            <th>
              Experience
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>

          ${
            a
              .map(
                x => `

              <tr>

                <td>

                  <strong>
                    ${esc(
                      x.full_name
                    )}
                  </strong>


                  <br>


                  ${esc(
                    x.gender
                  )}


                  <br>


                  <small>

                    ${esc(
                      x.city
                    )}

                  </small>

                </td>


                <td>

                  <strong>

                    ${esc(
                      x.duration
                    )}

                  </strong>


                  <br>


                  <small>

                    Start:

                    ${esc(
                      x.start_date ||
                      "Not specified"
                    )}

                  </small>

                </td>


                <td>

                  ${esc(
                    x.program
                  )}


                  <br>


                  <small>

                    ${esc(
                      x.message
                    )}

                  </small>

                </td>


                <td>

                  ${esc(
                    x.phone
                  )}


                  <br>


                  ${esc(
                    x.email
                  )}

                </td>


                <td>

                  ${esc(
                    x.experience
                  )}

                </td>


                <td>

                  <select
                    onchange="setStudentStatus(${x.id},this.value)"
                  >

                    ${[
                      "new",
                      "reviewing",
                      "accepted",
                      "enrolled",
                      "completed",
                      "declined"

                    ]
                      .map(
                        s =>
                          `<option
                            ${
                              x.status === s
                                ? "selected"
                                : ""
                            }
                          >
                            ${s}
                          </option>`
                      )
                      .join("")}

                  </select>

                </td>

              </tr>

            `
              )
              .join("")

          }

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   STUDENT STATUS
   ========================================================= */

window.setStudentStatus =
  async (
    id,
    status
  ) => {

    try {

      await api(
        "/api/admin/student-applications/" +
        id +
        "/status",
        {

          method:
            "PUT",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({
              status
            })

        }
      );

    }


    catch (err) {

      alert(
        err.message
      );

    }

  };


/* =========================================================
   STARTUP
   ========================================================= */

if (token) {

  showApp();

}

else {

  $("#login-view")
    ?.classList.remove(
      "hidden"
    );


  $("#app-view")
    ?.classList.add(
      "hidden"
    );

}
