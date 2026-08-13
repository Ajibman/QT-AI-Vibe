# Tells qmake where to find the Android template directory
ANDROID_PACKAGE_SOURCE_DIR = $$PWD/android

# Core Qt modules required for AI and graphics applications
QT += core gui widgets

# Target name of your compiled binary
TARGET = QT-AI-Project
TEMPLATE = app

# Ensure your actual C++ source files are listed here
SOURCES += \
    main.cpp \
    qtaiapp.cpp

HEADERS += \
    qtaiapp.h
