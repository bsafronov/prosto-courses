# Separate course authoring from presentation

The Authoring Agent knows only the course directory convention, required metadata, semantic MDX components, and content-quality rules. The platform automatically applies Course Overview and Lesson layouts, navigation, and progress behavior; generated content never imports or modifies those concerns. This provider-independent authoring contract avoids repeating presentation boilerplate across Courses and keeps platform changes isolated from course source.
