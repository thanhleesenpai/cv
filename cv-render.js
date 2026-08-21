(function (global) {
  const UI = {
    vi: { about:"GIỚI THIỆU BẢN THÂN", education:"HỌC VẤN", experience:"KINH NGHIỆM LÀM VIỆC",
          projects:"DỰ ÁN", certifications:"CHỨNG CHỈ", skills:"CÁC KỸ NĂNG & SỞ THÍCH",
          updated:"Cập nhật lần cuối", tech:"Công nghệ sử dụng:", download:"Tải CV PDF" },
    en: { about:"ABOUT ME", education:"EDUCATION", experience:"WORK EXPERIENCE",
          projects:"PROJECTS", certifications:"CERTIFICATIONS", skills:"SKILLS",
          updated:"Last updated", tech:"Tech stack:", download:"Download PDF" }
  };

  function t(field, lang){
    if (field == null) return '';
    if (typeof field === 'string') return field;
    return field[lang] != null ? field[lang] : (field.vi || '');
  }

  function setPath(obj, path, value){
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
    cur[keys[keys.length - 1]] = value;
  }

  function el(tag, opts, children){
    opts = opts || {};
    const e = document.createElement(tag);
    if (opts.class) e.className = opts.class;
    if (opts.text != null) e.textContent = opts.text;
    if (opts.href != null){ e.href = opts.href; e.target = '_blank'; e.rel = 'noopener'; }
    (children || []).forEach(c => { if (c) e.appendChild(c); });
    return e;
  }

  function mount(container, cv, lang, editable){
    // field(): renders a value that may be a plain string or a {vi,en} bilingual
    // object. In editable mode, writes keystrokes straight back into `cv` at
    // `basePath` (plain string fields) or `basePath.<lang>` (bilingual fields).
    function field(tag, cls, basePath, value){
      const isBilingual = value != null && typeof value === 'object';
      const path = isBilingual ? basePath + '.' + lang : basePath;
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      e.textContent = t(value, lang);
      if (editable){
        e.classList.add('editable');
        e.contentEditable = 'plaintext-only';
        e.dataset.path = path;
        e.addEventListener('input', () => setPath(cv, path, e.textContent));
      }
      return e;
    }

    function renderHeader(){
      const p = cv.person;
      const avatarWrap = el('div', { class:'avatar-wrap' });
      const img = document.createElement('img');
      img.alt = p.name; img.src = p.photo || 'photo.jpg';
      img.onerror = function(){
        if (this.dataset.step !== 'png'){ this.dataset.step = 'png'; this.src = (p.photo || 'photo').replace(/\.\w+$/, '') + '.png'; }
        else { this.style.display = 'none'; fallback.style.display = 'flex'; }
      };
      const fallback = el('div', { class:'avatar-fallback', text: p.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() });
      avatarWrap.append(img, fallback);

      const infoBox = el('div');
      infoBox.appendChild(field('h1', null, 'person.name', p.name));
      infoBox.appendChild(field('div', 'role', 'person.role', p.role));
      p.infoLines.forEach((line, i) => infoBox.appendChild(field('div', 'info-line', `person.infoLines.${i}`, line)));

      const emailLine = el('div', { class:'info-line' });
      emailLine.append('Email: ');
      if (editable) emailLine.appendChild(field('span', null, 'person.email', p.email));
      else emailLine.appendChild(el('a', { text: p.email, href: 'mailto:' + p.email }));
      infoBox.appendChild(emailLine);

      const ghLine = el('div', { class:'info-line' });
      ghLine.append('Github: ');
      if (editable) ghLine.appendChild(field('span', null, 'person.github.label', p.github.label));
      else ghLine.appendChild(el('a', { text: p.github.label, href: p.github.url }));
      infoBox.appendChild(ghLine);

      if (p.linkedin){
        const liLine = el('div', { class:'info-line' });
        liLine.append('LinkedIn: ');
        if (editable) liLine.appendChild(field('span', null, 'person.linkedin.label', p.linkedin.label));
        else liLine.appendChild(el('a', { text: p.linkedin.label, href: p.linkedin.url }));
        infoBox.appendChild(liLine);
      }

      return el('section', { class:'header' }, [avatarWrap, infoBox]);
    }

    function sectionTitle(key){
      return el('h2', { class:'section-title', text: UI[lang][key] });
    }

    function renderAbout(){
      return el('section', { class:'block' }, [
        sectionTitle('about'),
        el('p', {}, [field('span', null, 'about', cv.about)])
      ]);
    }

    function renderEducation(){
      const rows = cv.education.map((edu, i) => {
        const base = `education.${i}`;
        return el('div', { class:'entry-row' }, [
          field('div', 'date-col', `${base}.date`, edu.date),
          el('div', { class:'content-col' }, [
            field('div', 'title', `${base}.title`, edu.title),
            field('div', 'subtitle', `${base}.subtitle`, edu.subtitle),
            el('p', { class:'desc' }, [el('em', {}, [field('span', null, `${base}.note`, edu.note)])])
          ])
        ]);
      });
      return el('section', { class:'block' }, [sectionTitle('education'), ...rows]);
    }

    function renderExperience(){
      const rows = cv.experience.map((job, i) => {
        const base = `experience.${i}`;
        const ul = el('ul');
        job.bullets.forEach((b, j) => ul.appendChild(el('li', {}, [field('span', null, `${base}.bullets.${j}`, b)])));
        return el('div', { class:'entry-row' }, [
          field('div', 'date-col', `${base}.date`, job.date),
          el('div', { class:'content-col' }, [
            field('div', 'title', `${base}.company`, job.company),
            field('div', 'subtitle', `${base}.role`, job.role),
            ul
          ])
        ]);
      });
      return el('section', { class:'block' }, [sectionTitle('experience'), ...rows]);
    }

    function renderProjects(){
      const rows = cv.projects.map((pr, i) => {
        const base = `projects.${i}`;
        const titleDiv = el('div', { class:'title' });
        titleDiv.appendChild(field('span', null, `${base}.title`, pr.title));
        if (pr.titleSuffix != null){
          titleDiv.append(' ');
          titleDiv.appendChild(field('span', null, `${base}.titleSuffix`, pr.titleSuffix));
        }
        const links = Array.isArray(pr.links)
          ? pr.links
          : (pr.github ? [{ label: 'GitHub', url: pr.github }] : []);
        const linkLines = links.map((link, j) => {
          const linkLine = el('div', { class:'meta-line' });
          if (editable){
            linkLine.appendChild(field('span', null, `${base}.links.${j}.label`, link.label));
            linkLine.append(' ');
            linkLine.appendChild(field('span', null, `${base}.links.${j}.url`, link.url));
          } else {
            linkLine.appendChild(el('span', { text: link.label + ': ' }));
            linkLine.appendChild(el('a', { text: link.url.replace(/^https?:\/\//, ''), href: link.url }));
          }
          return linkLine;
        });

        const ul = el('ul');
        pr.bullets.forEach((b, j) => ul.appendChild(el('li', {}, [field('span', null, `${base}.bullets.${j}`, b)])));

        const techLine = el('div', { class:'tech-line' }, [el('b', { text: UI[lang].tech + ' ' })]);
        techLine.appendChild(field('span', null, `${base}.tech`, pr.tech));

        return el('div', { class:'entry-row' }, [
          field('div', 'date-col', `${base}.date`, pr.date),
          el('div', { class:'content-col' }, [
            titleDiv,
            field('div', 'meta-line', `${base}.meta`, pr.meta),
            ...linkLines,
            el('p', { class:'desc' }, [field('span', null, `${base}.desc`, pr.desc)]),
            ul,
            techLine
          ])
        ]);
      });
      return el('section', { class:'block' }, [sectionTitle('projects'), ...rows]);
    }

    function renderCertifications(){
      const rows = cv.certifications.map((c, i) => {
        const base = `certifications.${i}`;
        return el('div', { class:'entry-row' }, [
          field('div', 'date-col', `${base}.date`, c.date),
          el('div', { class:'content-col' }, [field('div', 'title', `${base}.title`, c.title)])
        ]);
      });
      return el('section', { class:'block' }, [sectionTitle('certifications'), ...rows]);
    }

    function renderSkills(){
      const dl = el('dl', { class:'skills-grid' });
      cv.skills.forEach((s, i) => {
        dl.appendChild(field('dt', null, `skills.${i}.label`, s.label));
        dl.appendChild(field('dd', null, `skills.${i}.value`, s.value));
      });
      return el('section', { class:'block' }, [sectionTitle('skills'), dl]);
    }

    function renderFooter(){
      return el('footer', { text: UI[lang].updated + ': ' + cv.meta.updated });
    }

    container.innerHTML = '';
    container.appendChild(renderHeader());
    container.appendChild(renderAbout());
    container.appendChild(renderEducation());
    container.appendChild(renderExperience());
    container.appendChild(renderProjects());
    container.appendChild(renderCertifications());
    container.appendChild(renderSkills());
    container.appendChild(renderFooter());
  }

  global.CVRender = { mount, UI, t };
})(window);
