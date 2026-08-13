 # Target configuration
TARGET = QT-AI-Project
TEMPLATE = app
CONFIG += c++17 c++20_ok

# Core Qt modules for cross-platform mobile UI
QT += core gui quick qml

# Android-specific configuration
ANDROID_PACKAGE_SOURCE_DIR = $$PWD/android

# Missing Source files linkage
SOURCES += \
    main.cpp \
    qtaiapp.cpp

HEADERS += \
    qtaiapp.h

RESOURCES += \
    qml.qrc

# ONNX Runtime Integration (Paths adapt to your local SDK location)
# INCLUDEPATH += $$PWD/libs/onnxruntime/include
# LIBS += -L$$PWD/libs/onnxruntime/lib -lonnxruntime
